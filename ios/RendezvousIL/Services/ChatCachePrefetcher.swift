import Foundation

extension Notification.Name {
    /// Posted after chat channels/messages are written to disk (push prefetch or background refresh).
    static let rendezvousChatCacheUpdated = Notification.Name("rendezvousChatCacheUpdated")
    /// Ask the signed-in session to prefetch chat for an optional channel id (from APNs).
    static let rendezvousChatPushPrefetch = Notification.Name("rendezvousChatPushPrefetch")
}

/// Keeps chat channels + recent thread messages warm on disk so Chat feels instant on weak Wi‑Fi.
enum ChatCachePrefetcher {
    private static var lastFullRefreshAt: Date?
    private static let fullRefreshCooldown: TimeInterval = 45
    /// How many channel threads to keep warm on disk (list order = most recent activity).
    static let warmThreadLimit = 20
    /// Cap stored messages per channel so disk stays lean.
    static let messagesPerChannelLimit = 20

    /// Refresh channel list + optional focused channel messages. Safe to call often (coalesced).
    static func refresh(
        using client: APIClient,
        channelId: String? = nil,
        force: Bool = false
    ) async {
        let now = Date()
        if !force,
           channelId == nil,
           let last = lastFullRefreshAt,
           now.timeIntervalSince(last) < fullRefreshCooldown {
            return
        }

        do {
            let response = try await RepositoryFetch.withTimeout(seconds: 20) {
                try await client.getChatChannels()
            }
            let channels = response.channels.sortedForDisplay()
            ChatDataStore.saveChannels(channels)
            lastFullRefreshAt = now

            var focusIds: [String] = Array(channels.prefix(warmThreadLimit).map(\.id))
            if let channelId, !channelId.isEmpty, !focusIds.contains(channelId) {
                focusIds.insert(channelId, at: 0)
                if focusIds.count > warmThreadLimit {
                    focusIds = Array(focusIds.prefix(warmThreadLimit))
                }
            }

            await withTaskGroup(of: Void.self) { group in
                for id in focusIds {
                    group.addTask {
                        await prefetchMessages(channelId: id, using: client)
                    }
                }
            }

            await MainActor.run {
                NotificationCenter.default.post(name: .rendezvousChatCacheUpdated, object: nil)
            }
        } catch {
            #if DEBUG
            AppLog.bootstrap("chat prefetch failed: \(error.localizedDescription)")
            #endif
        }
    }

    private static func prefetchMessages(channelId: String, using client: APIClient) async {
        do {
            let response = try await RepositoryFetch.withTimeout(seconds: 20) {
                try await client.getChatMessages(channelId: channelId, limit: messagesPerChannelLimit)
            }
            let trimmed = Array(response.messages.suffix(messagesPerChannelLimit))
            ChatDataStore.saveMessages(trimmed, channelId: channelId)
        } catch {
            #if DEBUG
            AppLog.bootstrap("chat message prefetch \(channelId) failed: \(error.localizedDescription)")
            #endif
        }
    }

    /// Extract channel id from APNs userInfo (`channelId` custom key or `thread-id` / threadId `chat-<uuid>`).
    static func channelId(fromUserInfo userInfo: [AnyHashable: Any]) -> String? {
        if let id = userInfo["channelId"] as? String, !id.isEmpty { return id }
        if let id = userInfo["channel_id"] as? String, !id.isEmpty { return id }

        let threadCandidates: [String?] = [
            userInfo["thread-id"] as? String,
            userInfo["threadId"] as? String,
            (userInfo["aps"] as? [String: Any])?["thread-id"] as? String,
        ]
        for raw in threadCandidates {
            guard let raw, raw.hasPrefix("chat-") else { continue }
            let id = String(raw.dropFirst("chat-".count))
            if !id.isEmpty { return id }
        }

        if let urlString = userInfo["url"] as? String,
           let url = URL(string: urlString),
           let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems,
           let id = items.first(where: { $0.name == "channel" })?.value,
           !id.isEmpty {
            return id
        }
        return nil
    }
}
