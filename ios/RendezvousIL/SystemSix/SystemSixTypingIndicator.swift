import SwiftUI

struct SystemSixTypingPeer: Equatable {
    let id: String
    let name: String
    let avatarURL: URL?
}

struct SystemSixTypingIndicator: View {
    let peer: SystemSixTypingPeer
    var avatar: (SystemSixTypingPeer) -> AnyView

    init(peer: SystemSixTypingPeer, @ViewBuilder avatar: @escaping (SystemSixTypingPeer) -> some View) {
        self.peer = peer
        self.avatar = { AnyView(avatar($0)) }
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            avatar(peer)
                .frame(width: 32, height: 32)
            SystemSixTypingDots()
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color(.systemGray5), in: Capsule())
            Spacer(minLength: 48)
        }
        .padding(.top, 4)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(peer.name) is typing")
    }
}

struct SystemSixTypingDots: View {
    @State private var phase = 0

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(Color.secondary)
                    .frame(width: 6, height: 6)
                    .opacity(phase == index ? 1 : 0.35)
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.45).repeatForever()) {
                phase = 2
            }
        }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(450))
                phase = (phase + 1) % 3
            }
        }
    }
}
