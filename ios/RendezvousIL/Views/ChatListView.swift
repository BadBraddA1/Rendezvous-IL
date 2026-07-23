import SwiftUI

struct ChatListView: View {
    @Environment(AppSession.self) private var session

    @State private var channels: [ChatChannelSummary] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var statusHint: String?

    var body: some View {
        NavigationStack {
            Group {
                if let errorMessage {
                    ContentUnavailableView {
                        Label("Could not load chat", systemImage: "exclamationmark.triangle")
                    } description: {
                        Text(errorMessage)
                    } actions: {
                        Button("Try again") {
                            Task { await load(force: true) }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(BrandColors.lake)
                    }
                } else if channels.isEmpty && !isLoading {
                    ContentUnavailableView {
                        Label("No chats yet", systemImage: "bubble.left.and.bubble.right")
                    } description: {
                        Text(statusHint ?? "Register for a Rendezvous year on rendezvousil.com to join that year's group chat.")
                    } actions: {
                        Button("Refresh") {
                            Task { await load(force: true) }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(BrandColors.lake)
                    }
                } else {
                    channelList
                }
            }
            .navigationTitle("Chat")
            .refreshable { await load(force: true) }
            .task { await load(force: false) }
            .safeAreaInset(edge: .top, spacing: 0) {
                if session.isChatDemoMode {
                    HStack(spacing: 8) {
                        Image(systemName: "flag.fill")
                        Text("Demo chat — admin test channels (live).")
                            .font(.caption)
                    }
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                    .background(BrandColors.warmSurface)
                }
            }
            .navigationDestination(for: ChatChannelSummary.self) { channel in
                ChatThreadView(channel: channel)
                    .onDisappear {
                        // Refresh badges/order after the thread marks messages read.
                        Task { await load(force: true) }
                    }
            }
        }
    }

    private var channelList: some View {
        List(channels) { channel in
            NavigationLink(value: channel) {
                HStack(alignment: .top, spacing: 10) {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(channel.displayTitle)
                                .font(channel.unreadCount > 0 ? .headline.weight(.semibold) : .headline)
                            if channel.is_test {
                                Text("Test")
                                    .font(.caption2.weight(.semibold))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.secondary.opacity(0.15))
                                    .clipShape(Capsule())
                            }
                            Spacer()
                            if let at = channel.last_message_at, !at.isEmpty {
                                Text(ChatMessageFormatting.relativeTime(at))
                                    .font(.caption2)
                                    .foregroundStyle(.tertiary)
                            }
                        }
                        if let preview = channel.last_message_preview, !preview.isEmpty {
                            Text(preview)
                                .font(.subheadline)
                                .foregroundStyle(channel.unreadCount > 0 ? .primary : .secondary)
                                .lineLimit(2)
                        } else {
                            Text("No messages yet — say hello!")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                    if let badge = channel.unreadBadgeText {
                        Text(badge)
                            .font(.caption2.weight(.bold).monospacedDigit())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(BrandColors.lake, in: Capsule())
                            .accessibilityLabel("\(channel.unreadCount) unread")
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .overlay {
            if isLoading && channels.isEmpty {
                ProgressView("Loading chats…")
            }
        }
    }

    private func load(force: Bool) async {
        if session.isAppStoreScreenshotMode {
            channels = AppStoreScreenshotMode.sampleChannels
            isLoading = false
            errorMessage = nil
            return
        }

        guard let client = session.apiClient else {
            isLoading = false
            errorMessage = "Could not connect your account. Try signing out and back in."
            return
        }

        if !force, let cached = ChatDataStore.loadChannels(), !cached.isEmpty {
            channels = cached.sortedForDisplay()
            isLoading = false
        } else if !force {
            isLoading = true
        }
        errorMessage = nil
        statusHint = nil
        defer { isLoading = false }

        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.getChatChannels()
            }
            channels = response.channels.sortedForDisplay()
            ChatDataStore.saveChannels(channels)
            if channels.isEmpty {
                statusHint = session.isChatDemoMode
                    ? "No active test channels yet. In admin → Year Chat, create a channel and mark it Test."
                    : await emptyChatHint(using: client)
            }
        } catch APIError.unauthorized {
            if channels.isEmpty {
                errorMessage = "Session expired. Sign out and sign in again."
            }
        } catch {
            if APIError.isCancellation(error) { return }
            if channels.isEmpty {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func emptyChatHint(using client: APIClient) async -> String {
        guard let status = try? await client.fetchMobileStatus() else {
            return "Register for a Rendezvous year on rendezvousil.com to join that year's group chat."
        }
        if status.isAdmin == true {
            return "Signed in as admin, but no active channels were returned. Pull to refresh."
        }
        let years = status.attendedYears ?? []
        if years.isEmpty {
            let email = status.email ?? "your account"
            return "No registration is linked to \(email) yet. Open the website while signed in, or ask an admin to add you to a chat."
        }
        return "Registration found for \(years.map(YearFormatting.label).joined(separator: ", ")), but no channels yet. Pull to refresh."
    }
}

#Preview {
    ChatListView()
        .environment(AppSession())
}
