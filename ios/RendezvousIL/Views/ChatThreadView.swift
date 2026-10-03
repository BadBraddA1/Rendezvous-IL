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
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var pendingImages: [PendingChatImage] = []
    @State private var showPollSheet = false
    @State private var pollQuestion = ""
    @State private var pollOptions = ["", ""]
    @State private var enlargedPhotoURL: URL?
    @State private var reactionDetail: ReactionDetail?
    @State private var sendStatuses: [String: SystemSixSendStatus] = [:]

    private let maxPhotos = 6

    private struct ReactionDetail: Identifiable {
        let messageId: String
        let emoji: String
        let summary: ChatReactionSummary

        var id: String { "\(messageId)-\(emoji)" }
    }

    private enum RealtimeStatus {
        case connecting
        case connected
        case unavailable
    }

    private struct PendingChatImage: Identifiable {
        let id = UUID()
        let data: Data
        let uiImage: UIImage
    }

    private var currentUserId: String {
        if session.isChatDemoMode {
            return "demo-chat-reviewer"
        }
        if session.isAppStoreScreenshotMode {
            return "demo-alex"
        }
        guard session.isClerkReady else { return "" }
        return Clerk.shared.user?.id ?? ""
    }

    private var canSend: Bool {
        !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !pendingImages.isEmpty
    }

    var body: some View {
        VStack(spacing: 0) {
            if session.isChatDemoMode {
                HStack(spacing: 8) {
                    Image(systemName: "flag.fill")
                    Text("Demo chat — live test rooms from admin (send/delete work).")
                        .font(.caption)
                }
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(BrandColors.warmSurface)
            }

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

            systemSixThread
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .scrollDismissesKeyboard(.interactively)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            composer
        }
        .navigationTitle(channel.displayTitle)
        .navigationBarTitleDisplayMode(.inline)
        .task { await setup() }
        .onDisappear {
            if !session.isAppStoreScreenshotMode {
                ablyService.disconnect()
            }
        }
        .onChange(of: pickerItems) { _, items in
            Task { await loadPickerItems(items) }
        }
        .sheet(item: $reactionDetail) { detail in
            reactionDetailSheet(detail)
        }
        .fullScreenCover(isPresented: Binding(
            get: { enlargedPhotoURL != nil },
            set: { if !$0 { enlargedPhotoURL = nil } }
        )) {
            if let url = enlargedPhotoURL {
                ChatPhotoViewer(url: url) {
                    enlargedPhotoURL = nil
                }
            }
        }
        .sheet(isPresented: $showPollSheet) {
            NavigationStack {
                Form {
                    Section("Question") {
                        TextField("Ask something…", text: $pollQuestion, axis: .vertical)
                            .lineLimit(2...4)
                    }
                    Section("Options") {
                        ForEach(pollOptions.indices, id: \.self) { index in
                            HStack {
                                TextField("Option \(index + 1)", text: $pollOptions[index])
                                if pollOptions.count > 2 {
                                    Button(role: .destructive) {
                                        pollOptions.remove(at: index)
                                    } label: {
                                        Image(systemName: "minus.circle.fill")
                                    }
                                }
                            }
                        }
                        if pollOptions.count < 6 {
                            Button("Add option") {
                                pollOptions.append("")
                            }
                        }
                    }
                }
                .navigationTitle("Create poll")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { showPollSheet = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Post") {
                            Task { await createPoll() }
                        }
                        .disabled(
                            pollQuestion.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                                || pollOptions.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }.count < 2
                        )
                    }
                }
            }
        }
    }

    private var systemSixThread: some View {
        SystemSixChatThread(
            messages: messages,
            itemCount: messages.count,
            senderId: { $0.sender_clerk_id },
            createdAt: { SystemSixMessageGrouping.parseCreatedAt($0.created_at) },
            messageId: { $0.id },
            isMine: { !currentUserId.isEmpty && $0.sender_clerk_id == currentUserId },
            onRefresh: { await reloadMessages() },
            empty: {
                if isLoading {
                    ProgressView()
                } else {
                    Text("Start the conversation in \(channel.displayTitle).")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
            },
            row: { message, mine in
                messageRow(message, mine: mine)
            },
            typing: { EmptyView() },
            avatar: { message in
                chatAvatar(name: message.sender_display_name, urlString: message.sender_avatar_url)
            },
            senderName: { message in
                HStack(spacing: 6) {
                    if message.is_announcement {
                        Image(systemName: "megaphone.fill")
                            .font(.caption2)
                            .foregroundStyle(.orange)
                    }
                    if message.isPoll {
                        Image(systemName: "chart.bar.fill")
                            .font(.caption2)
                            .foregroundStyle(BrandColors.lake)
                    }
                    Text(message.sender_display_name)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
            }
        )
    }

    private func chatAvatar(name: String, urlString: String?) -> some View {
        Group {
            if let urlString, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        chatAvatarFallback(name: name)
                    }
                }
            } else {
                chatAvatarFallback(name: name)
            }
        }
        .frame(width: 32, height: 32)
        .clipShape(Circle())
    }

    private func chatAvatarFallback(name: String) -> some View {
        let initial = name.trimmingCharacters(in: .whitespacesAndNewlines).first.map(String.init) ?? "?"
        return Circle()
            .fill(Color(.systemGray4))
            .overlay {
                Text(initial)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
    }

    @ViewBuilder
    private func messageRow(_ message: ChatMessage, mine: Bool) -> some View {
        let created = SystemSixMessageGrouping.parseCreatedAt(message.created_at)
        let status = sendStatuses[message.id]
        SystemSixBubbleChrome(
            createdAt: created,
            sendStatus: status,
            onRetry: status == .failed ? { Task { await retrySend(messageId: message.id) } } : nil
        ) {
            messageBubbleBody(message, mine: mine)
        }
    }

    @ViewBuilder
    private func messageBubbleBody(_ message: ChatMessage, mine: Bool) -> some View {
        let canDelete = mine || canModerate
        let bubbleFill: Color = {
            if message.is_announcement { return Color.orange.opacity(0.18) }
            if message.isPoll { return BrandColors.lake.opacity(0.14) }
            return mine ? BrandColors.lake : Color(.systemGray5)
        }()
        let bubbleText: Color = {
            if message.is_announcement || message.isPoll { return .primary }
            return mine ? .white : .primary
        }()

        VStack(alignment: mine ? .trailing : .leading, spacing: 4) {
                let urls = message.photoURLs
                if !urls.isEmpty {
                    let columns = urls.count == 1 ? 1 : 2
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 3), count: columns), spacing: 3) {
                        ForEach(urls, id: \.self) { urlString in
                            if let url = URL(string: urlString) {
                                Button {
                                    enlargedPhotoURL = url
                                } label: {
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
                                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("Enlarge photo")
                            }
                        }
                    }
                }

                if message.isPoll, let options = message.poll_options {
                    pollCard(message: message, options: options)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(bubbleFill, in: ChatBubbleShape(outgoing: mine))
                } else if !message.body.isEmpty {
                    Text(message.body)
                        .font(.body)
                        .foregroundStyle(bubbleText)
                        .multilineTextAlignment(mine ? .trailing : .leading)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 9)
                        .background(bubbleFill, in: ChatBubbleShape(outgoing: mine))
                        .contextMenu {
                            if canDelete {
                                Button(role: .destructive) {
                                    Task { await deleteMessage(message.id) }
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                        }
                }

                reactionBar(for: message)
                    .padding(.horizontal, 4)
            }
    }

    /// iMessage-style bubble: large radius on three corners, tighter on the “tail” side.
    private struct ChatBubbleShape: Shape {
        var outgoing: Bool

        func path(in rect: CGRect) -> Path {
            UnevenRoundedRectangle(
                topLeadingRadius: 18,
                bottomLeadingRadius: outgoing ? 18 : 5,
                bottomTrailingRadius: outgoing ? 5 : 18,
                topTrailingRadius: 18,
                style: .continuous
            )
            .path(in: rect)
        }
    }

    @ViewBuilder
    private func pollCard(message: ChatMessage, options: [String]) -> some View {
        let counts = message.poll_counts ?? Array(repeating: 0, count: options.count)
        let total = counts.reduce(0, +)
        VStack(alignment: .leading, spacing: 8) {
            Text(message.poll_question ?? message.body)
                .font(.body.weight(.semibold))
            ForEach(Array(options.enumerated()), id: \.offset) { index, option in
                let count = index < counts.count ? counts[index] : 0
                let pct = total > 0 ? Int(round(Double(count) / Double(total) * 100)) : 0
                let selected = message.my_vote == index
                Button {
                    Task { await vote(messageId: message.id, optionIndex: index) }
                } label: {
                    HStack {
                        Text(option)
                            .font(.subheadline)
                            .foregroundStyle(.primary)
                        Spacer()
                        Text(total > 0 ? "\(count) · \(pct)%" : "\(count)")
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(selected ? BrandColors.lake.opacity(0.22) : Color.secondary.opacity(0.08))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(selected ? BrandColors.lake : Color.clear, lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
            }
            Text("\(total) vote\(total == 1 ? "" : "s")")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private func reactionBar(for message: ChatMessage) -> some View {
        HStack(spacing: 6) {
            if !message.reactionList.isEmpty {
                ForEach(message.reactionList, id: \.emoji) { reaction in
                    Button {
                        reactionDetail = ReactionDetail(
                            messageId: message.id,
                            emoji: reaction.emoji,
                            summary: reaction
                        )
                    } label: {
                        HStack(spacing: 2) {
                            Text(reaction.emoji)
                            Text("\(reaction.count)")
                                .font(.caption2.monospacedDigit())
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            Capsule().fill(
                                reaction.reacted_by_me
                                    ? BrandColors.lake.opacity(0.25)
                                    : Color.secondary.opacity(0.12)
                            )
                        )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(reaction.emoji) \(reaction.count) reactions")
                }
            }

            Menu {
                ForEach(ChatReactionEmoji.all, id: \.self) { emoji in
                    Button(emoji) {
                        Task { await toggleReaction(messageId: message.id, emoji: emoji) }
                    }
                }
            } label: {
                Image(systemName: "face.smiling")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .frame(width: 28, height: 28)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Add reaction")
        }
    }

    @ViewBuilder
    private func reactionDetailSheet(_ detail: ReactionDetail) -> some View {
        let live = messages.first(where: { $0.id == detail.messageId })?
            .reactionList.first(where: { $0.emoji == detail.emoji }) ?? detail.summary
        NavigationStack {
            List {
                if live.reactorList.isEmpty {
                    Text("No names yet — pull to refresh for who reacted.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(live.reactorList, id: \.clerk_user_id) { reactor in
                        HStack {
                            Text(reactor.display_name)
                            if reactor.clerk_user_id == currentUserId {
                                Text("You")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(BrandColors.lake)
                            }
                        }
                    }
                }
            }
            .navigationTitle("\(detail.emoji) · \(live.count)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { reactionDetail = nil }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(live.reacted_by_me ? "Remove" : "Add") {
                        Task {
                            await toggleReaction(messageId: detail.messageId, emoji: detail.emoji)
                        }
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private var composer: some View {
        SystemSixChatComposer(
            text: $draft,
            placeholder: "Message",
            canSend: canSend && !isSending,
            onSend: { Task { await sendMessage(isAnnouncement: false) } },
            pending: pendingImages.map { image in
                SystemSixPendingAttachment(id: image.id.uuidString, preview: Image(uiImage: image.uiImage))
            },
            onRemovePending: { id in
                pendingImages.removeAll { $0.id.uuidString == id }
            },
            leading: {
                PhotosPicker(
                    selection: $pickerItems,
                    maxSelectionCount: max(1, maxPhotos - pendingImages.count),
                    matching: .images
                ) {
                    Image(systemName: "photo")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(BrandColors.lake)
                        .frame(width: 36, height: 36)
                        .contentShape(Rectangle())
                }
                .disabled(pendingImages.count >= maxPhotos || isSending)
                .accessibilityLabel("Attach photos")
            },
            trailing: {
                if canModerate {
                    Button {
                        showPollSheet = true
                    } label: {
                        Image(systemName: "chart.bar.fill")
                            .font(.body.weight(.semibold))
                            .foregroundStyle(BrandColors.lake)
                            .frame(width: 36, height: 36)
                    }
                    .disabled(isSending)
                    .accessibilityLabel("Create poll")

                    Button {
                        Task { await sendMessage(isAnnouncement: true) }
                    } label: {
                        Image(systemName: "megaphone.fill")
                            .font(.body.weight(.semibold))
                            .foregroundStyle(.orange)
                            .frame(width: 36, height: 36)
                    }
                    .disabled(!canSend || isSending)
                    .accessibilityLabel("Send announcement")
                }
            }
        )
    }

    /// Paint disk cache immediately, then refresh + Ably off the critical path.
    private func setup() async {
        if session.isAppStoreScreenshotMode {
            canModerate = false
            messages = AppStoreScreenshotMode.sampleMessages(for: channel.id)
            isLoading = false
            realtimeStatus = .connected
            errorMessage = nil
            return
        }

        paintCachedMessagesIfNeeded()
        canModerate = channel.canModerate || session.isAdmin

        Task {
            await session.refreshAdminStatus()
            canModerate = channel.canModerate || session.isAdmin
        }

        await refreshMessagesInBackground(showSpinnerWhenEmpty: messages.isEmpty)

        if session.isChatDemoMode {
            realtimeStatus = .unavailable
            return
        }
        await connectRealtime()
    }

    private func paintCachedMessagesIfNeeded() {
        guard messages.isEmpty,
              let cached = ChatDataStore.loadMessages(channelId: channel.id),
              !cached.isEmpty
        else { return }
        messages = cached
        isLoading = false
    }

    private func persistMessages() {
        ChatDataStore.saveMessages(messages, channelId: channel.id)
    }

    /// Pull-to-refresh and open path both use this — never blocks first paint when cache exists.
    private func reloadMessages() async {
        await refreshMessagesInBackground(showSpinnerWhenEmpty: messages.isEmpty)
    }

    private func refreshMessagesInBackground(showSpinnerWhenEmpty: Bool) async {
        if session.isAppStoreScreenshotMode {
            if messages.isEmpty {
                messages = AppStoreScreenshotMode.sampleMessages(for: channel.id)
            }
            isLoading = false
            errorMessage = nil
            return
        }

        paintCachedMessagesIfNeeded()

        guard let client = session.apiClient else {
            if messages.isEmpty {
                errorMessage = "Could not connect your account."
            }
            isLoading = false
            return
        }

        if showSpinnerWhenEmpty && messages.isEmpty {
            isLoading = true
        }
        defer { isLoading = false }

        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.getChatMessages(channelId: channel.id)
            }
            messages = response.messages
            persistMessages()
            if let moderate = response.can_moderate {
                canModerate = moderate || session.isAdmin
            } else {
                canModerate = session.isAdmin || channel.canModerate
            }
            errorMessage = nil
            if let detail = reactionDetail,
               let updated = messages.first(where: { $0.id == detail.messageId })?
                .reactionList.first(where: { $0.emoji == detail.emoji }) {
                reactionDetail = ReactionDetail(
                    messageId: detail.messageId,
                    emoji: detail.emoji,
                    summary: updated
                )
            }
        } catch {
            if APIError.isCancellation(error) { return }
            if messages.isEmpty {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func connectRealtime() async {
        if session.isAppStoreScreenshotMode || session.isChatDemoMode {
            realtimeStatus = session.isChatDemoMode ? .unavailable : .connected
            return
        }

        guard let client = session.apiClient else { return }
        realtimeStatus = .connecting

        do {
            let tokenResponse = try await RepositoryFetch.withTimeout(seconds: 10) {
                try await client.getAblyToken()
            }
            try await ablyService.connect(tokenRequest: tokenResponse.tokenRequest)
            ablyService.subscribe(channelId: channel.id) { event in
                switch event {
                case .message(let message):
                    if let index = messages.firstIndex(where: { $0.id == message.id }) {
                        messages[index] = message
                    } else {
                        messages.append(message)
                    }
                    persistMessages()
                case .deleted(let id):
                    messages.removeAll { $0.id == id }
                    persistMessages()
                case .reaction(let update):
                    applyReactionUpdate(update)
                case .pollUpdated(let messageId, let counts, let voterClerkId):
                    if let index = messages.firstIndex(where: { $0.id == messageId }) {
                        let old = messages[index]
                        messages[index] = ChatMessage(
                            id: old.id,
                            channel_id: old.channel_id,
                            sender_clerk_id: old.sender_clerk_id,
                            sender_display_name: old.sender_display_name,
                            sender_avatar_url: old.sender_avatar_url,
                            body: old.body,
                            image_url: old.image_url,
                            image_urls: old.image_urls,
                            kind: old.kind,
                            is_announcement: old.is_announcement,
                            poll_question: old.poll_question,
                            poll_options: old.poll_options,
                            poll_counts: counts,
                            my_vote: voterClerkId == currentUserId ? old.my_vote : old.my_vote,
                            reactions: old.reactions,
                            created_at: old.created_at
                        )
                        persistMessages()
                    }
                }
            }
            realtimeStatus = .connected
        } catch {
            if APIError.isCancellation(error) { return }
            realtimeStatus = .unavailable
        }
    }

    private func applyReactionUpdate(_ update: ChatReactionUpdate) {
        guard let index = messages.firstIndex(where: { $0.id == update.message_id }) else { return }
        let old = messages[index]
        let merged: [ChatReactionSummary]
        if update.actor_clerk_id == currentUserId {
            merged = update.reactions
        } else {
            merged = update.reactions.map { incoming in
                let prev = old.reactionList.first { $0.emoji == incoming.emoji }
                return ChatReactionSummary(
                    emoji: incoming.emoji,
                    count: incoming.count,
                    reacted_by_me: prev?.reacted_by_me ?? false,
                    reactors: incoming.reactors ?? prev?.reactors
                )
            }
        }
        messages[index] = ChatMessage(
            id: old.id,
            channel_id: old.channel_id,
            sender_clerk_id: old.sender_clerk_id,
            sender_display_name: old.sender_display_name,
            sender_avatar_url: old.sender_avatar_url,
            body: old.body,
            image_url: old.image_url,
            image_urls: old.image_urls,
            kind: old.kind,
            is_announcement: old.is_announcement,
            poll_question: old.poll_question,
            poll_options: old.poll_options,
            poll_counts: old.poll_counts,
            my_vote: old.my_vote,
            reactions: merged,
            created_at: old.created_at
        )
        persistMessages()
        if let detail = reactionDetail, detail.messageId == update.message_id,
           let updated = merged.first(where: { $0.emoji == detail.emoji }) {
            reactionDetail = ReactionDetail(
                messageId: detail.messageId,
                emoji: detail.emoji,
                summary: updated
            )
        } else if let detail = reactionDetail,
                  detail.messageId == update.message_id,
                  !merged.contains(where: { $0.emoji == detail.emoji }) {
            reactionDetail = nil
        }
    }

    private func loadPickerItems(_ items: [PhotosPickerItem]) async {
        guard !items.isEmpty else { return }
        var loaded: [PendingChatImage] = []
        for item in items {
            if pendingImages.count + loaded.count >= maxPhotos { break }
            do {
                if let data = try await item.loadTransferable(type: Data.self),
                   let uiImage = UIImage(data: data) {
                    let prepared = DirectoryImageProcessor.prepareForUpload(data)
                    let preview = UIImage(data: prepared) ?? uiImage
                    loaded.append(PendingChatImage(data: prepared, uiImage: preview))
                }
            } catch {
                errorMessage = "Could not load one of the selected photos."
            }
        }
        pendingImages.append(contentsOf: loaded)
        pickerItems = []
    }

    private func sendMessage(isAnnouncement: Bool) async {
        let body = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard canSend else { return }

        if session.isAppStoreScreenshotMode {
            isSending = true
            defer { isSending = false }
            let iso = ISO8601DateFormatter()
            let local = ChatMessage(
                id: "shot-local-\(UUID().uuidString)",
                channel_id: channel.id,
                sender_clerk_id: "demo-alex",
                sender_display_name: session.userDisplayName ?? "Alex",
                sender_avatar_url: nil,
                body: body.isEmpty && !pendingImages.isEmpty ? "(Photo)" : body,
                image_url: nil,
                image_urls: nil,
                kind: "text",
                is_announcement: isAnnouncement,
                poll_question: nil,
                poll_options: nil,
                poll_counts: nil,
                my_vote: nil,
                reactions: [],
                created_at: iso.string(from: Date())
            )
            messages.append(local)
            draft = ""
            pendingImages = []
            pickerItems = []
            errorMessage = nil
            return
        }

        guard let client = session.apiClient else { return }

        let imagesToSend = pendingImages
        let optimisticId = "local-\(UUID().uuidString)"
        let iso = ISO8601DateFormatter()
        let optimistic = ChatMessage(
            id: optimisticId,
            channel_id: channel.id,
            sender_clerk_id: currentUserId,
            sender_display_name: session.userDisplayName ?? "You",
            sender_avatar_url: nil,
            body: body.isEmpty && !imagesToSend.isEmpty ? "(Photo)" : body,
            image_url: nil,
            image_urls: nil,
            kind: "text",
            is_announcement: isAnnouncement,
            poll_question: nil,
            poll_options: nil,
            poll_counts: nil,
            my_vote: nil,
            reactions: [],
            created_at: iso.string(from: Date())
        )

        messages.append(optimistic)
        sendStatuses[optimisticId] = .sending
        draft = ""
        pendingImages = []
        pickerItems = []
        errorMessage = nil
        isSending = true
        defer { isSending = false }

        do {
            let response = try await RepositoryFetch.withTimeout(seconds: 45) {
                try await client.sendChatMessage(
                    channelId: channel.id,
                    body: body,
                    isAnnouncement: isAnnouncement,
                    imageDataList: imagesToSend.map(\.data)
                )
            }
            messages.removeAll { $0.id == optimisticId }
            sendStatuses.removeValue(forKey: optimisticId)
            if let index = messages.firstIndex(where: { $0.id == response.message.id }) {
                messages[index] = response.message
            } else {
                messages.append(response.message)
            }
            persistMessages()
        } catch {
            if APIError.isCancellation(error) { return }
            sendStatuses[optimisticId] = .failed
        }
    }

    private func retrySend(messageId: String) async {
        guard sendStatuses[messageId] == .failed,
              let failed = messages.first(where: { $0.id == messageId }) else { return }
        sendStatuses[messageId] = .sending
        guard let client = session.apiClient else {
            sendStatuses[messageId] = .failed
            return
        }
        isSending = true
        defer { isSending = false }
        do {
            let response = try await RepositoryFetch.withTimeout(seconds: 45) {
                try await client.sendChatMessage(
                    channelId: channel.id,
                    body: failed.body == "(Photo)" ? "" : failed.body,
                    isAnnouncement: failed.is_announcement,
                    imageDataList: []
                )
            }
            messages.removeAll { $0.id == messageId }
            sendStatuses.removeValue(forKey: messageId)
            if let index = messages.firstIndex(where: { $0.id == response.message.id }) {
                messages[index] = response.message
            } else {
                messages.append(response.message)
            }
            persistMessages()
        } catch {
            if APIError.isCancellation(error) { return }
            sendStatuses[messageId] = .failed
        }
    }

    private func createPoll() async {
        let question = pollQuestion.trimmingCharacters(in: .whitespacesAndNewlines)
        let options = pollOptions
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        guard options.count >= 2, !question.isEmpty else { return }
        guard let client = session.apiClient else { return }

        isSending = true
        defer { isSending = false }

        do {
            let response = try await RepositoryFetch.withTimeout(seconds: 20) {
                try await client.createChatPoll(
                    channelId: channel.id,
                    question: question,
                    options: options
                )
            }
            if !messages.contains(where: { $0.id == response.message.id }) {
                messages.append(response.message)
            }
            persistMessages()
            showPollSheet = false
            pollQuestion = ""
            pollOptions = ["", ""]
            errorMessage = nil
        } catch {
            if APIError.isCancellation(error) { return }
            errorMessage = error.localizedDescription
        }
    }

    private func vote(messageId: String, optionIndex: Int) async {
        if let index = messages.firstIndex(where: { $0.id == messageId }) {
            let old = messages[index]
            var counts = old.poll_counts ?? Array(repeating: 0, count: old.poll_options?.count ?? 0)
            if let previous = old.my_vote, previous >= 0, previous < counts.count {
                counts[previous] = max(0, counts[previous] - 1)
            }
            if optionIndex >= 0, optionIndex < counts.count {
                counts[optionIndex] += 1
            }
            messages[index] = ChatMessage(
                id: old.id,
                channel_id: old.channel_id,
                sender_clerk_id: old.sender_clerk_id,
                sender_display_name: old.sender_display_name,
                sender_avatar_url: old.sender_avatar_url,
                body: old.body,
                image_url: old.image_url,
                image_urls: old.image_urls,
                kind: old.kind,
                is_announcement: old.is_announcement,
                poll_question: old.poll_question,
                poll_options: old.poll_options,
                poll_counts: counts,
                my_vote: optionIndex,
                reactions: old.reactions,
                created_at: old.created_at
            )
        }

        guard let client = session.apiClient else { return }
        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.voteOnChatPoll(messageId: messageId, optionIndex: optionIndex)
            }
            if let index = messages.firstIndex(where: { $0.id == messageId }) {
                let old = messages[index]
                messages[index] = ChatMessage(
                    id: old.id,
                    channel_id: old.channel_id,
                    sender_clerk_id: old.sender_clerk_id,
                    sender_display_name: old.sender_display_name,
                    sender_avatar_url: old.sender_avatar_url,
                    body: old.body,
                    image_url: old.image_url,
                    image_urls: old.image_urls,
                    kind: old.kind,
                    is_announcement: old.is_announcement,
                    poll_question: old.poll_question,
                    poll_options: old.poll_options,
                    poll_counts: response.poll.poll_counts,
                    my_vote: response.poll.my_vote ?? optionIndex,
                    reactions: old.reactions,
                    created_at: old.created_at
                )
            }
        } catch {
            if APIError.isCancellation(error) { return }
            await reloadMessages()
        }
    }

    private func toggleReaction(messageId: String, emoji: String) async {
        guard let client = session.apiClient else { return }
        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.toggleChatReaction(messageId: messageId, emoji: emoji)
            }
            applyReactionUpdate(response.reaction)
        } catch {
            if APIError.isCancellation(error) { return }
            errorMessage = error.localizedDescription
        }
    }

    private func deleteMessage(_ id: String) async {
        if session.isAppStoreScreenshotMode {
            messages.removeAll { $0.id == id }
            return
        }

        guard let client = session.apiClient else { return }
        do {
            try await RepositoryFetch.withTimeout {
                try await client.deleteChatMessage(messageId: id)
            }
            messages.removeAll { $0.id == id }
            persistMessages()
            errorMessage = nil
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
            unread_count: 0,
            can_moderate: false
        ))
    }
    .environment(AppSession())
}
