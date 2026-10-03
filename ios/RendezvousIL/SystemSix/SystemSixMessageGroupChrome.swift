import SwiftUI

/// One avatar per group; 4pt inside / 16pt between groups (System Six decision 1).
struct SystemSixMessageGroupChrome<Avatar: View, Name: View, MessageStack: View>: View {
    let isMine: Bool
    let showAvatar: Bool
    @ViewBuilder var avatar: () -> Avatar
    @ViewBuilder var name: () -> Name
    @ViewBuilder var messages: () -> MessageStack

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if isMine { Spacer(minLength: 48) }

            if !isMine {
                if showAvatar {
                    avatar()
                } else {
                    Color.clear.frame(width: 32, height: 32)
                }
            }

            VStack(alignment: isMine ? .trailing : .leading, spacing: 4) {
                if showAvatar && !isMine {
                    name()
                }
                messages()
            }

            if !isMine { Spacer(minLength: 48) }
        }
        .padding(.bottom, 16)
    }
}

/// Long-press reveals exact time; failed sends fade with retry (decisions 2 + 3).
struct SystemSixBubbleChrome<Content: View>: View {
    let createdAt: Date
    let sendStatus: SystemSixSendStatus?
    let onRetry: (() -> Void)?
    @ViewBuilder var content: () -> Content

    @State private var showExactTime = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            content()
                .opacity(sendStatus == .failed ? 0.55 : 1)
                .overlay {
                    if showExactTime {
                        Text(SystemSixMessageGrouping.formatExactTime(createdAt))
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(.ultraThinMaterial, in: Capsule())
                            .transition(.opacity)
                    }
                }
                .onLongPressGesture(minimumDuration: 0.35) {
                    withAnimation(.easeOut(duration: 0.15)) { showExactTime = true }
                } onPressingChanged: { pressing in
                    if !pressing {
                        withAnimation(.easeOut(duration: 0.2)) { showExactTime = false }
                    }
                }

            if sendStatus == .failed {
                HStack(spacing: 8) {
                    Text(SystemSixChatConfig.failedLabel)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if let onRetry {
                        Button(SystemSixChatConfig.retryLabel, action: onRetry)
                            .font(.caption.weight(.semibold))
                    }
                }
                .transition(.opacity)
            }
        }
    }
}
