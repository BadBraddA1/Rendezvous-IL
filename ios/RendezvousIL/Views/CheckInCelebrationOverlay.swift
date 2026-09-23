import AVFoundation
import SwiftUI
import UIKit

/// Full-screen green flash + confetti + spoken congrats after a successful check-in.
struct CheckInCelebrationOverlay: View {
    let familyLastName: String
    var onDismiss: () -> Void

    @State private var pulse = false
    @State private var showCopy = false

    var body: some View {
        ZStack {
            Color.green
                .opacity(pulse ? 0.92 : 0.72)
                .ignoresSafeArea()
                .animation(.easeInOut(duration: 0.45).repeatForever(autoreverses: true), value: pulse)

            ConfettiEmitterRepresentable()
                .ignoresSafeArea()
                .allowsHitTesting(false)

            VStack(spacing: 16) {
                Text("🎉")
                    .font(.system(size: 72))
                    .scaleEffect(showCopy ? 1 : 0.4)
                    .opacity(showCopy ? 1 : 0)

                Text("Congratulations!")
                    .font(.largeTitle.weight(.bold))
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.25), radius: 4, y: 2)

                Text("You’ve been checked in")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.95))

                Text("\(familyLastName) family")
                    .font(.title3.weight(.medium))
                    .foregroundStyle(.white.opacity(0.9))
                    .padding(.top, 4)
            }
            .multilineTextAlignment(.center)
            .padding(28)
            .scaleEffect(showCopy ? 1 : 0.85)
            .opacity(showCopy ? 1 : 0)
        }
        .onAppear {
            pulse = true
            withAnimation(.spring(response: 0.45, dampingFraction: 0.72)) {
                showCopy = true
            }
            CheckInCelebrationSpeaker.speak(
                "Congratulations! You've been checked in."
            )
        }
        .onDisappear {
            CheckInCelebrationSpeaker.stop()
        }
        .onTapGesture(perform: onDismiss)
        .accessibilityAddTraits(.isModal)
        .accessibilityLabel("Congratulations. \(familyLastName) family has been checked in.")
    }
}

private enum CheckInCelebrationSpeaker {
    private static let synthesizer = AVSpeechSynthesizer()

    static func speak(_ line: String) {
        let utterance = AVSpeechUtterance(string: line)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.95
        utterance.pitchMultiplier = 1.08
        synthesizer.stopSpeaking(at: .immediate)
        synthesizer.speak(utterance)
    }

    static func stop() {
        synthesizer.stopSpeaking(at: .immediate)
    }
}

/// UIKit confetti burst (CAEmitterLayer) — big and obvious for desk check-in.
private struct ConfettiEmitterRepresentable: UIViewRepresentable {
    func makeUIView(context: Context) -> ConfettiView {
        let view = ConfettiView()
        view.backgroundColor = .clear
        view.isUserInteractionEnabled = false
        return view
    }

    func updateUIView(_ uiView: ConfettiView, context: Context) {}
}

private final class ConfettiView: UIView {
    private var emitter: CAEmitterLayer?

    override func layoutSubviews() {
        super.layoutSubviews()
        guard emitter == nil else {
            emitter?.frame = bounds
            emitter?.emitterPosition = CGPoint(x: bounds.midX, y: -20)
            return
        }
        let layer = CAEmitterLayer()
        layer.frame = bounds
        layer.emitterPosition = CGPoint(x: bounds.midX, y: -20)
        layer.emitterSize = CGSize(width: bounds.width, height: 1)
        layer.emitterShape = .line
        layer.beginTime = CACurrentMediaTime()

        let colors: [UIColor] = [
            .systemYellow, .systemPink, .systemTeal, .white, .systemOrange, .systemGreen,
        ]
        layer.emitterCells = colors.map { color in
            let cell = CAEmitterCell()
            cell.birthRate = 18
            cell.lifetime = 4.5
            cell.velocity = 220
            cell.velocityRange = 80
            cell.emissionLongitude = .pi
            cell.emissionRange = .pi / 4
            cell.spin = 3
            cell.spinRange = 6
            cell.scale = 0.12
            cell.scaleRange = 0.08
            cell.yAcceleration = 140
            cell.contents = confettiImage(color: color)?.cgImage
            return cell
        }
        self.layer.addSublayer(layer)
        emitter = layer

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) { [weak layer] in
            layer?.birthRate = 0.35
        }
    }

    private func confettiImage(color: UIColor) -> UIImage? {
        let size = CGSize(width: 12, height: 18)
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { ctx in
            color.setFill()
            ctx.cgContext.fill(CGRect(origin: .zero, size: size).insetBy(dx: 1, dy: 1))
        }
    }
}
