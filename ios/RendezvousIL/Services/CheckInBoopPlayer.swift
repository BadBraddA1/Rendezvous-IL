import AudioToolbox
import AVFoundation
import Foundation
import MediaPlayer
import UIKit

/// Desk check-in tones. Ignores the silent switch, always buzzes, and briefly
/// raises media volume when it’s at zero so the boop can be heard (iOS shows the
/// system volume HUD when that happens — unavoidable). Mute banner only if the
/// nudge fails.
enum CheckInBoopPlayer {
    enum Kind {
        case good
        case bad
    }

    private static let engine = AVAudioEngine()
    private static let player = AVAudioPlayerNode()
    private static var didConfigure = false
    private static let lock = NSLock()
    private static let notificationHaptic = UINotificationFeedbackGenerator()
    private static let impactHaptic = UIImpactFeedbackGenerator(style: .heavy)
    private static var volumeNudgeView: MPVolumeView?

    /// Target volume when nudging up from silence.
    static let audibleMinimum: Float = 0.45

    /// Plays the boop. `onNeedsMuteAlert` runs on the main queue only when volume
    /// is still too low after a nudge attempt.
    static func play(_ kind: Kind, onNeedsMuteAlert: (() -> Void)? = nil) {
        buzz(kind)
        DispatchQueue.main.async {
            ensureAudibleVolume { audible in
                playTone(kind)
                if !audible {
                    onNeedsMuteAlert?()
                }
            }
        }
    }

    private static func buzz(_ kind: Kind) {
        AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)

        DispatchQueue.main.async {
            notificationHaptic.prepare()
            impactHaptic.prepare()
            impactHaptic.impactOccurred(intensity: 1.0)
            switch kind {
            case .good:
                notificationHaptic.notificationOccurred(.success)
            case .bad:
                notificationHaptic.notificationOccurred(.error)
            }
        }
    }

    /// Raises system media volume when it’s near zero. Leaves it up for the desk
    /// session (one HUD flash, then later boops stay audible without another nudge).
    private static func ensureAudibleVolume(then: @escaping (_ audible: Bool) -> Void) {
        let current = AVAudioSession.sharedInstance().outputVolume
        guard current < audibleMinimum else {
            then(true)
            return
        }

        guard let window = keyWindow else {
            then(false)
            return
        }

        volumeNudgeView?.removeFromSuperview()
        let volumeView = MPVolumeView(frame: CGRect(x: -2000, y: -2000, width: 1, height: 1))
        volumeView.alpha = 0.01
        volumeView.isUserInteractionEnabled = false
        window.addSubview(volumeView)
        volumeNudgeView = volumeView
        volumeView.layoutIfNeeded()

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
            if let slider = volumeView.subviews.compactMap({ $0 as? UISlider }).first {
                slider.value = audibleMinimum
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
                let after = AVAudioSession.sharedInstance().outputVolume
                let audible = after >= audibleMinimum * 0.85
                then(audible)
                volumeView.removeFromSuperview()
                if volumeNudgeView === volumeView {
                    volumeNudgeView = nil
                }
            }
        }
    }

    private static var keyWindow: UIWindow? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow }
            ?? UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first
    }

    private static func playTone(_ kind: Kind) {
        lock.lock()
        defer { lock.unlock() }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [.duckOthers])
            try session.setActive(true, options: [.notifyOthersOnDeactivation])
            try configureEngineIfNeeded()
            let buffer = toneBuffer(kind: kind)
            player.stop()
            player.scheduleBuffer(buffer, at: nil, options: [])
            if !player.isPlaying {
                player.play()
            }
        } catch {
            // Fail soft — mute banner / buzz still cover feedback.
        }
    }

    private static func configureEngineIfNeeded() throws {
        guard !didConfigure else { return }
        engine.attach(player)
        let format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1)!
        engine.connect(player, to: engine.mainMixerNode, format: format)
        engine.mainMixerNode.outputVolume = 1
        try engine.start()
        didConfigure = true
    }

    private static func toneBuffer(kind: Kind) -> AVAudioPCMBuffer {
        let sampleRate: Double = 44_100
        let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!

        switch kind {
        case .good:
            return compose(
                format: format,
                sampleRate: sampleRate,
                segments: [
                    (freq: 880, duration: 0.07, gain: 0.7),
                    (freq: 0, duration: 0.04, gain: 0),
                    (freq: 1320, duration: 0.11, gain: 0.65),
                ]
            )
        case .bad:
            return compose(
                format: format,
                sampleRate: sampleRate,
                segments: [
                    (freq: 220, duration: 0.22, gain: 0.72),
                ]
            )
        }
    }

    private static func compose(
        format: AVAudioFormat,
        sampleRate: Double,
        segments: [(freq: Double, duration: Double, gain: Float)]
    ) -> AVAudioPCMBuffer {
        let totalSamples = segments.reduce(0) { $0 + Int($1.duration * sampleRate) }
        let frameCount = AVAudioFrameCount(max(totalSamples, 1))
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount)!
        buffer.frameLength = frameCount
        guard let data = buffer.floatChannelData?[0] else { return buffer }

        var offset = 0
        for segment in segments {
            let count = Int(segment.duration * sampleRate)
            for i in 0..<count {
                if segment.freq <= 0 || segment.gain <= 0 {
                    data[offset + i] = 0
                } else {
                    let t = Double(i) / sampleRate
                    let env: Float
                    if i < 40 {
                        env = Float(i) / 40
                    } else if i > count - 60 {
                        env = Float(count - i) / 60
                    } else {
                        env = 1
                    }
                    data[offset + i] = sin(Float(2 * Double.pi * segment.freq * t)) * segment.gain * max(0, env)
                }
            }
            offset += count
        }
        return buffer
    }
}
