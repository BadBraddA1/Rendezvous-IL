import SwiftUI

@Observable
final class SystemSixChatScrollState {
    static let bottomAnchorID = "system-six-scroll-bottom"

    private(set) var unseenCount = 0
    private(set) var scrollToBottomToken = 0
    private var stickToBottom = true
    private var previousItemCount = 0
    private var viewportHeight: CGFloat = 0
    private var bottomMaxY: CGFloat = 0

    func bind(itemCount: Int) {
        guard itemCount > previousItemCount else {
            previousItemCount = itemCount
            return
        }
        let delta = itemCount - previousItemCount
        previousItemCount = itemCount

        if stickToBottom {
            requestScrollToBottom()
        } else {
            unseenCount += delta
        }
    }

    func resetItemCount(_ count: Int) {
        previousItemCount = count
    }

    func updateViewport(height: CGFloat) {
        viewportHeight = height
        evaluateNearBottom()
    }

    func updateBottomMaxY(_ value: CGFloat) {
        bottomMaxY = value
        evaluateNearBottom()
    }

    func userScrolled() {
        evaluateNearBottom()
    }

    func scrollToBottomTapped() {
        unseenCount = 0
        stickToBottom = true
        requestScrollToBottom()
    }

    private func requestScrollToBottom() {
        scrollToBottomToken &+= 1
        unseenCount = 0
        stickToBottom = true
    }

    private func evaluateNearBottom() {
        guard viewportHeight > 0 else { return }
        let distance = bottomMaxY - viewportHeight
        let near = distance <= SystemSixChatConfig.nearBottomThreshold
        stickToBottom = near
        if near { unseenCount = 0 }
    }
}

private struct SystemSixViewportHeightKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

private struct SystemSixBottomMaxYKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

struct SystemSixScrollPill: View {
    let count: Int
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(SystemSixChatConfig.newMessagesLabel(count: count))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(Capsule().fill(Color.primary))
        }
        .buttonStyle(.plain)
        .shadow(color: .black.opacity(0.12), radius: 8, y: 2)
        .padding(.bottom, 8)
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}

/// Wraps message list content with System Six scroll anchoring + new-message pill.
struct SystemSixChatScrollShell<Header: View, Content: View>: View {
    let itemCount: Int
    var onRefresh: (() async -> Void)?
    @ViewBuilder var header: () -> Header
    @ViewBuilder var content: () -> Content

    @State private var scrollState = SystemSixChatScrollState()

    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollViewReader { proxy in
                ScrollView {
                    header()
                    content()
                        .background(
                            GeometryReader { geo in
                                Color.clear.preference(
                                    key: SystemSixBottomMaxYKey.self,
                                    value: geo.frame(in: .named("systemSixScroll")).maxY
                                )
                            }
                        )
                    Color.clear
                        .frame(height: 1)
                        .id(SystemSixChatScrollState.bottomAnchorID)
                }
                .coordinateSpace(name: "systemSixScroll")
                .background(
                    GeometryReader { geo in
                        Color.clear.preference(
                            key: SystemSixViewportHeightKey.self,
                            value: geo.size.height
                        )
                    }
                )
                .onPreferenceChange(SystemSixViewportHeightKey.self) { scrollState.updateViewport(height: $0) }
                .onPreferenceChange(SystemSixBottomMaxYKey.self) { scrollState.updateBottomMaxY($0) }
                .simultaneousGesture(
                    DragGesture(minimumDistance: 8).onChanged { _ in scrollState.userScrolled() }
                )
                .onChange(of: itemCount) { _, new in scrollState.bind(itemCount: new) }
                .onChange(of: scrollState.scrollToBottomToken) { _, _ in
                    withAnimation(.easeOut(duration: 0.25)) {
                        proxy.scrollTo(SystemSixChatScrollState.bottomAnchorID, anchor: .bottom)
                    }
                }
                .modifier(SystemSixRefreshModifier(onRefresh: onRefresh))
            }

            if scrollState.unseenCount > 0 {
                SystemSixScrollPill(count: scrollState.unseenCount) {
                    scrollState.scrollToBottomTapped()
                }
            }
        }
        .onAppear { scrollState.resetItemCount(itemCount) }
    }
}

private struct SystemSixRefreshModifier: ViewModifier {
    let onRefresh: (() async -> Void)?

    func body(content: Content) -> some View {
        if let onRefresh {
            content.refreshable { await onRefresh() }
        } else {
            content
        }
    }
}
