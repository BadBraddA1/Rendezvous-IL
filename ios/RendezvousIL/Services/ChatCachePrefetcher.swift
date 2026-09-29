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

            let focusIds: [String]
            if let channelId, !channelId.isEmpty {
                focusIds = [channelId]
            } else {
                // Warm the top few threads so opening Chat → thread is instant.
                focusIds = Array(channels.prefix(3).map(\.id))
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
                try await client.getChatMessages(channelId: channelId)
            }
            ChatDataStore.saveMessages(response.messages, channelId: channelId)
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
