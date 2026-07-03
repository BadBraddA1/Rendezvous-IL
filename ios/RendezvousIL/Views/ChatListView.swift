import Clerk
import SwiftUI

struct ChatListView: View {
    @Environment(AppSession.self) private var session

    @State private var channels: [ChatChannelSummary] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Group {
                if !session.isSignedIn {
                    signedOutState
                } else if let errorMessage {
                    ContentUnavailableView("Could not load chat", systemImage: "exclamationmark.triangle", description: Text(errorMessage))
                } else if channels.isEmpty && !isLoading {
                    ContentUnavailableView(
                        "No chats yet",
                        systemImage: "bubble.left.and.bubble.right",
                        description: Text("Register for a Rendezvous year to join that year's group chat.")
                    )
                } else {
                    channelList
                }
            }
            .navigationTitle("Chat")
            .refreshable { await load(force: true) }
            .task {
                await session.refreshAuth()
                await load(force: false)
            }
            .navigationDestination(for: ChatChannelSummary.self) { channel in
                ChatThreadView(channel: channel)
            }
        }
    }

    private var signedOutState: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 10) {
                    Image(systemName: "bubble.left.and.bubble.right.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(BrandColors.lake)

                    Text("Rendezvous Chat")
                        .font(.title2.weight(.semibold))

                    Text("Each year you register for opens a group chat with other families. Past years stay available too.")
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)

                ClerkAuthPanel(
                    mode: .signIn,
                    sectionTitle: "Sign in to chat",
                    helperText: "Use your rendezvousil.com account. Year chats unlock after you register for that event year.",
                    buttonTitle: "Sign in"
                )
            }
            .padding(20)
        }
    }

    private var channelList: some View {
        List(channels) { channel in
            NavigationLink(value: channel) {
                VStack(alignment: .leading, spacing: 4) {
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
                    }
                    if let preview = channel.last_message_preview, !preview.isEmpty {
                        Text(preview)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    } else {
                        Text("No messages yet")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .overlay {
            if isLoading && channels.isEmpty {
                ProgressView()
            }
        }
    }

    private func load(force: Bool) async {
        guard session.isSignedIn, let client = session.apiClient else {
            isLoading = false
            return
        }

        if !force { isLoading = true }
        errorMessage = nil
        defer { isLoading = false }

        do {
            let response = try await client.getChatChannels()
            channels = response.channels
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    ChatListView()
        .environment(AppSession())
}
