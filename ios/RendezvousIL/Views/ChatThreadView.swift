import Clerk
import SwiftUI

struct ChatThreadView: View {
    @Environment(AppSession.self) private var session

    let channel: ChatChannelSummary

    @State private var messages: [ChatMessage] = []
    @State private var draft = ""
    @State private var isLoading = true
    @State private var isSending = false
    @State private var errorMessage: String?
    @State private var realtimeStatus: RealtimeStatus = .connecting
    @State private var ablyService = AblyService()

    private enum RealtimeStatus {
        case connecting
        case connected
        case unavailable
    }

    private var currentUserId: String {
        guard session.isClerkReady else { return "" }
        return Clerk.shared.user?.id ?? ""
    }

    var body: some View {
        VStack(spacing: 0) {
            if realtimeStatus == .unavailable {
                HStack(spacing: 8) {
                    Image(systemName: "wifi.slash")
                    Text("Live updates unavailable — pull to refresh or send a message.")
                        .font(.caption)
                }
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(BrandColors.warmSurface)
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    .padding(.top, 8)
            }

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        if isLoading && messages.isEmpty {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                                .padding(.top, 40)
                        } else if messages.isEmpty {
                            Text("Start the conversation in \(channel.displayTitle).")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                                .frame(maxWidth: .infinity)
                                .padding(.top, 40)
                        } else {
                            ForEach(messages) { message in
                                messageBubble(message)
                                    .id(message.id)
                            }
                        }
                    }
                    .padding()
                }
                .refreshable { await reloadMessages() }
                .onChange(of: messages.count) { _, _ in
                    if let last = messages.last {
                        withAnimation {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }

            composer
        }
        .navigationTitle(channel.displayTitle)
        .navigationBarTitleDisplayMode(.inline)
        .task { await setup() }
        .onDisappear {
            ablyService.disconnect()
        }
    }

    @ViewBuilder
    private func messageBubble(_ message: ChatMessage) -> some View {
        let mine = !currentUserId.isEmpty && message.sender_clerk_id == currentUserId
        HStack {
            if mine { Spacer(minLength: 40) }
            VStack(alignment: mine ? .trailing : .leading, spacing: 4) {
                HStack(spacing: 6) {
                    if message.is_announcement {
                        Image(systemName: "megaphone.fill")
                            .font(.caption2)
                            .foregroundStyle(.orange)
                    }
                    Text(message.sender_display_name)
                        .font(.caption.weight(.semibold))
                    Text(ChatMessageFormatting.relativeTime(message.created_at))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Text(message.body)
                    .font(.body)
                    .multilineTextAlignment(mine ? .trailing : .leading)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                message.is_announcement
                    ? Color.orange.opacity(0.15)
                    : mine ? BrandColors.lake.opacity(0.18) : Color.secondary.opacity(0.12)
            )
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            if !mine { Spacer(minLength: 40) }
        }
    }

    private var composer: some View {
        HStack(alignment: .bottom, spacing: 8) {
            TextField("Message", text: $draft, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(1...4)
            Button {
                Task { await sendMessage() }
            } label: {
                if isSending {
                    ProgressView()
                } else {
                    Image(systemName: "paperplane.fill")
                }
            }
            .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSending)
        }
        .padding()
        .background(.bar)
    }

    private func setup() async {
        await reloadMessages()
        await connectRealtime()
    }

    private func reloadMessages() async {
        guard let client = session.apiClient else {
            errorMessage = "Could not connect your account."
            isLoading = false
            return
        }
        isLoading = messages.isEmpty
        defer { isLoading = false }

        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.getChatMessages(channelId: channel.id)
            }
            messages = response.messages
            errorMessage = nil
        } catch {
            if messages.isEmpty {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func connectRealtime() async {
        guard let client = session.apiClient else { return }
        realtimeStatus = .connecting

        do {
            let tokenResponse = try await RepositoryFetch.withTimeout(seconds: 10) {
                try await client.getAblyToken()
            }
            try await ablyService.connect(tokenRequest: tokenResponse.tokenRequest)
            ablyService.subscribe(channelId: channel.id) { message in
                if !messages.contains(where: { $0.id == message.id }) {
                    messages.append(message)
                }
            }
            realtimeStatus = .connected
        } catch {
            realtimeStatus = .unavailable
        }
    }

    private func sendMessage() async {
        guard let client = session.apiClient else { return }
        let body = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty else { return }

        isSending = true
        defer { isSending = false }

        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.sendChatMessage(channelId: channel.id, body: body)
            }
            if !messages.contains(where: { $0.id == response.message.id }) {
                messages.append(response.message)
            }
            draft = ""
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    NavigationStack {
        ChatThreadView(channel: ChatChannelSummary(
            id: "year-2026",
            name: "Rendezvous 2026 Chat",
            channel_type: "year",
            event_year: 2026,
            description: nil,
            is_active: true,
            is_test: false,
            last_message_preview: nil,
            last_message_at: nil
        ))
    }
    .environment(AppSession())
}
