import SwiftUI

/// Copy-in thread shell: day blocks + scroll pill + typing slot at list bottom.
struct SystemSixChatThread<Message, Header: View, Row: View, Typing: View, Empty: View>: View {
    let messages: [Message]
    let itemCount: Int
    let senderId: (Message) -> String
    let createdAt: (Message) -> Date
    let messageId: (Message) -> String
    let isMine: (Message) -> Bool
    var onRefresh: (() async -> Void)?
    @ViewBuilder var header: () -> Header
    @ViewBuilder var empty: () -> Empty
    @ViewBuilder var row: (Message, Bool) -> Row
    @ViewBuilder var typing: () -> Typing
    @ViewBuilder var avatar: (Message) -> AnyView
    @ViewBuilder var senderName: (Message) -> AnyView

    init(
        messages: [Message],
        itemCount: Int,
        senderId: @escaping (Message) -> String,
        createdAt: @escaping (Message) -> Date,
        messageId: @escaping (Message) -> String,
        isMine: @escaping (Message) -> Bool,
        onRefresh: (() async -> Void)? = nil,
        @ViewBuilder header: @escaping () -> Header = { EmptyView() },
        @ViewBuilder empty: @escaping () -> Empty,
        @ViewBuilder row: @escaping (Message, Bool) -> Row,
        @ViewBuilder typing: @escaping () -> Typing,
        @ViewBuilder avatar: @escaping (Message) -> some View,
        @ViewBuilder senderName: @escaping (Message) -> some View
    ) {
        self.messages = messages
        self.itemCount = itemCount
        self.senderId = senderId
        self.createdAt = createdAt
        self.messageId = messageId
        self.isMine = isMine
        self.onRefresh = onRefresh
        self.header = header
        self.empty = empty
        self.row = row
        self.typing = typing
        self.avatar = { AnyView(avatar($0)) }
        self.senderName = { AnyView(senderName($0)) }
    }

    private var days: [SystemSixDayBlock<Message>] {
        SystemSixMessageGrouping.group(
            messages,
            senderId: senderId,
            createdAt: createdAt,
            id: messageId
        )
    }

    var body: some View {
        SystemSixChatScrollShell(itemCount: itemCount, onRefresh: onRefresh, header: header) {
            LazyVStack(spacing: 0) {
                if messages.isEmpty {
                    empty()
                        .frame(maxWidth: .infinity)
                        .padding(.top, 40)
                } else {
                    ForEach(days, id: \.dayKey) { day in
                        SystemSixDayDivider(label: day.label)
                        ForEach(day.groups, id: \.id) { group in
                            let mine = group.messages.first.map(isMine) ?? false
                            SystemSixMessageGroupChrome(
                                isMine: mine,
                                showAvatar: true,
                                avatar: {
                                    if let first = group.messages.first {
                                        avatar(first)
                                    }
                                },
                                name: {
                                    if let first = group.messages.first {
                                        senderName(first)
                                    }
                                },
                                messages: {
                                    VStack(alignment: mine ? .trailing : .leading, spacing: 4) {
                                        ForEach(0 ..< group.messages.count, id: \.self) { index in
                                            let message = group.messages[index]
                                            row(message, mine)
                                                .id(messageId(message))
                                        }
                                    }
                                }
                            )
                            .padding(.bottom, -16)
                        }
                    }
                }
                typing()
                    .padding(.top, 4)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
    }
}
