import SwiftUI

/// Full-screen “you must clear this” banner when check-in boops can’t be forced audible.
struct CheckInMuteAlertOverlay: View {
    let kind: CheckInBoopPlayer.Kind
    var headlineOverride: String? = nil
    var onDismiss: () -> Void

    @State private var pulse = false
    @State private var hintExpanded = false

    private var headline: String {
        if let headlineOverride { return headlineOverride }
        switch kind {
        case .good: return "THAT WORKED"
        case .bad: return "NOPE"
        }
    }

    private var subtitle: String {
        switch kind {
        case .good: return "Scan / check-in succeeded"
        case .bad: return "Scan failed — try again"
        }
    }

    private var background: Color {
        switch kind {
        case .good: return Color(red: 1, green: 0.75, blue: 0)
        case .bad: return Color(red: 0.95, green: 0.15, blue: 0.2)
        }
    }

    var body: some View {
        ZStack {
            background
                .opacity(pulse ? 1 : 0.82)
                .ignoresSafeArea()
                .animation(.easeInOut(duration: 0.35).repeatForever(autoreverses: true), value: pulse)

            VStack(spacing: 20) {
                Spacer()

                Text(kind == .good ? "✅" : "⛔")
                    .font(.system(size: 80))

                Text(headline)
                    .font(.system(size: 44, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .shadow(color: .black.opacity(0.35), radius: 4, y: 2)

                Text(subtitle)
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.95))
                    .multilineTextAlignment(.center)

                Button {
                    onDismiss()
                } label: {
                    Text("CLEAR")
                        .font(.title.weight(.black))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 18)
                        .background(.white)
                        .foregroundStyle(background)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .padding(.horizontal, 28)
                .padding(.top, 12)

                Spacer()

                VStack(spacing: 8) {
                    Button {
                        withAnimation(.easeOut(duration: 0.2)) {
                            hintExpanded.toggle()
                        }
                    } label: {
                        Label(
                            hintExpanded ? "Hide hint" : "Why this banner?",
                            systemImage: "lightbulb.fill"
                        )
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.9))
                    }

                    if hintExpanded {
                        Text("Volume was too low to hear the boop (and we couldn’t raise it). Turn volume up and you wouldn’t have to clear these.")
                            .font(.footnote.weight(.medium))
                            .foregroundStyle(.white.opacity(0.9))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 28)
                            .transition(.opacity.combined(with: .move(edge: .bottom)))
                    }
                }
                .padding(.bottom, 28)
            }
            .padding(.horizontal, 16)
        }
        .onAppear { pulse = true }
        .accessibilityAddTraits(.isModal)
        .accessibilityLabel("\(headline). \(subtitle). Clear to continue.")
    }
}
