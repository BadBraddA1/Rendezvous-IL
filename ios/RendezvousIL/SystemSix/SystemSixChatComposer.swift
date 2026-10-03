import SwiftUI

struct SystemSixPendingAttachment: Identifiable {
    let id: String
    let preview: Image
}

/// System Six decision 6: attachment previews above text; field grows to N lines then scrolls.
struct SystemSixChatComposer<Leading: View, Trailing: View>: View {
    @Binding var text: String
    let placeholder: String
    let canSend: Bool
    let onSend: () -> Void
    let pending: [SystemSixPendingAttachment]
    let onRemovePending: ((String) -> Void)?
    @ViewBuilder var leading: () -> Leading
    @ViewBuilder var trailing: () -> Trailing

    init(
        text: Binding<String>,
        placeholder: String = SystemSixChatConfig.composerPlaceholder,
        canSend: Bool,
        onSend: @escaping () -> Void,
        pending: [SystemSixPendingAttachment] = [],
        onRemovePending: ((String) -> Void)? = nil,
        @ViewBuilder leading: @escaping () -> Leading = { EmptyView() },
        @ViewBuilder trailing: @escaping () -> Trailing = { EmptyView() }
    ) {
        _text = text
        self.placeholder = placeholder
        self.canSend = canSend
        self.onSend = onSend
        self.pending = pending
        self.onRemovePending = onRemovePending
        self.leading = leading
        self.trailing = trailing
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if !pending.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(pending) { item in
                            ZStack(alignment: .topTrailing) {
                                item.preview
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 72, height: 72)
                                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                if let onRemovePending {
                                    Button {
                                        onRemovePending(item.id)
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .symbolRenderingMode(.palette)
                                            .foregroundStyle(.white, .black.opacity(0.65))
                                    }
                                    .offset(x: 4, y: -4)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 12)
                }
            }

            HStack(alignment: .bottom, spacing: 8) {
                leading()
                TextField(placeholder, text: $text, axis: .vertical)
                    .lineLimit(1 ... SystemSixChatConfig.composerMaxLines)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .fill(Color(.secondarySystemBackground))
                    )
                trailing()
                Button(action: onSend) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 32))
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(
                            canSend ? Color.white : Color(.tertiaryLabel),
                            canSend ? Color.accentColor : Color(.quaternaryLabel)
                        )
                }
                .disabled(!canSend)
                .accessibilityLabel("Send")
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 10)
        }
        .padding(.top, 8)
        .background(.bar)
    }
}
