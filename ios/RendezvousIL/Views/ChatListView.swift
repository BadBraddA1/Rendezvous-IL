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
            .navigationDestination(for: ChatChannelSummary.self) { channel in
                ChatThreadView(channel: channel)
            }
        }
    }

    private var channelList: some View {
        List(channels) { channel in
            NavigationLink(value: channel) {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(channel.displayTitle)
                            .font(.headline)
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
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    } else {
                        Text("No messages yet — say hello!")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
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

        if !force { isLoading = true }
        errorMessage = nil
        statusHint = nil
        defer { isLoading = false }

        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.getChatChannels()
            }
            channels = response.channels.sortedForDisplay()
            if channels.isEmpty {
                statusHint = await emptyChatHint(using: client)
            }
        } catch APIError.unauthorized {
            errorMessage = "Session expired. Sign out and sign in again."
        } catch {
            if APIError.isCancellation(error) { return }
            errorMessage = error.localizedDescription
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
        return "Registration found for \(years.map(String.init).joined(separator: ", ")), but no channels yet. Pull to refresh."
    }
}

#Preview {
    ChatListView()
        .environment(AppSession())
}
