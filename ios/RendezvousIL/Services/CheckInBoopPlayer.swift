import AudioToolbox
import AVFoundation
import Foundation
import UIKit

/// Desk check-in tones. Ignores the silent switch and always buzzes.
/// Does **not** change system volume (that pops the iOS volume HUD).
/// When media volume is too low to hear, calls `onNeedsMuteAlert` so UI can show
/// a clear-to-dismiss banner instead.
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

    /// Below this, assume the boop won’t be heard — show the mute banner.
    static let audibleMinimum: Float = 0.12

    /// Plays the boop. `onNeedsMuteAlert` runs on the main queue only when volume is
    /// too low to hear (we never force the system slider).
    static func play(_ kind: Kind, onNeedsMuteAlert: (() -> Void)? = nil) {
        buzz(kind)
        let needsBanner = AVAudioSession.sharedInstance().outputVolume < audibleMinimum
        playTone(kind)
        if needsBanner {
            DispatchQueue.main.async {
                onNeedsMuteAlert?()
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

    private static func playTone(_ kind: Kind) {
        lock.lock()
        defer { lock.unlock() }

        do {
            let session = AVAudioSession.sharedInstance()
            // `.playback` ignores the Ring/Silent switch. Camera must not auto-reconfigure
            // the session (see CheckInQRScannerView).
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
