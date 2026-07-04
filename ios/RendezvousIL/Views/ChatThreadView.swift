import Clerk
import PhotosUI
import SwiftUI
import UIKit

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
    @State private var canModerate = false
    @State private var pickerItem: PhotosPickerItem?
    @State private var pendingImageData: Data?

    private enum RealtimeStatus {
        case connecting
        case connected
        case unavailable
    }

    private var currentUserId: String {
        guard session.isClerkReady else { return "" }
        return Clerk.shared.user?.id ?? ""
    }

    private var canSend: Bool {
        !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || pendingImageData != nil
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

            if canModerate {
                Text("You can moderate this chat")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(BrandColors.lake)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    .padding(.top, 6)
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
        .onChange(of: pickerItem) { _, item in
            guard let item else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self) {
                    pendingImageData = DirectoryImageProcessor.prepareForUpload(data)
                }
            }
        }
    }

    @ViewBuilder
    private func messageBubble(_ message: ChatMessage) -> some View {
        let mine = !currentUserId.isEmpty && message.sender_clerk_id == currentUserId
        let canDelete = mine || canModerate
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
                    if canDelete {
                        Button {
                            Task { await deleteMessage(message.id) }
                        } label: {
                            Image(systemName: "trash")
                                .font(.caption2)
                        }
                        .foregroundStyle(.secondary)
                    }
                }
                if let imageUrl = message.image_url, let url = URL(string: imageUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                        default:
                            ProgressView()
                        }
                    }
                    .frame(maxWidth: 220, maxHeight: 220)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                if !message.body.isEmpty {
                    Text(message.body)
                        .font(.body)
                        .multilineTextAlignment(mine ? .trailing : .leading)
                }
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
        VStack(alignment: .leading, spacing: 8) {
            if pendingImageData != nil {
                HStack {
                    Text("Photo attached")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Button("Remove") {
                        pendingImageData = nil
                        pickerItem = nil
                    }
                    .font(.caption.weight(.semibold))
                }
                .padding(.horizontal)
            }
            HStack(alignment: .bottom, spacing: 8) {
                PhotosPicker(selection: $pickerItem, matching: .images) {
                    Image(systemName: "photo")
                        .font(.title3)
                }
                TextField("Message", text: $draft, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...4)
                if canModerate {
                    Button {
                        Task { await sendMessage(isAnnouncement: true) }
                    } label: {
                        Image(systemName: "megaphone.fill")
                    }
                    .disabled(!canSend || isSending)
                }
                Button {
                    Task { await sendMessage(isAnnouncement: false) }
                } label: {
                    if isSending {
                        ProgressView()
                    } else {
                        Image(systemName: "paperplane.fill")
                    }
                }
                .disabled(!canSend || isSending)
            }
            .padding(.horizontal)
            .padding(.bottom)
        }
        .padding(.top, 8)
        .background(.bar)
    }

    private func setup() async {
        canModerate = channel.canModerate || session.isAdmin
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
            if let moderate = response.can_moderate {
                canModerate = moderate || session.isAdmin
            }
            errorMessage = nil
        } catch {
            if APIError.isCancellation(error) { return }
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
            if APIError.isCancellation(error) { return }
            realtimeStatus = .unavailable
        }
    }

    private func sendMessage(isAnnouncement: Bool) async {
        guard let client = session.apiClient else { return }
        let body = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard canSend else { return }

        isSending = true
        defer { isSending = false }

        do {
            let response = try await RepositoryFetch.withTimeout(seconds: 30) {
                try await client.sendChatMessage(
                    channelId: channel.id,
                    body: body,
                    isAnnouncement: isAnnouncement,
                    imageData: pendingImageData
                )
            }
            if !messages.contains(where: { $0.id == response.message.id }) {
                messages.append(response.message)
            }
            draft = ""
            pendingImageData = nil
            pickerItem = nil
            errorMessage = nil
        } catch {
            if APIError.isCancellation(error) { return }
            errorMessage = error.localizedDescription
        }
    }

    private func deleteMessage(_ id: String) async {
        guard let client = session.apiClient else { return }
        do {
            try await RepositoryFetch.withTimeout {
                try await client.deleteChatMessage(messageId: id)
            }
            messages.removeAll { $0.id == id }
        } catch {
            if APIError.isCancellation(error) { return }
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
            last_message_at: nil,
            can_moderate: false
        ))
    }
    .environment(AppSession())
}
