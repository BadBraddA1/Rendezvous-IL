import AVFoundation
import Foundation
import UIKit

/// Short success/fail tones that play even when the hardware silent switch is on.
/// Pairs with a strong haptic so desk staff still get feedback if media volume is at zero.
enum CheckInBoopPlayer {
    enum Kind {
        case good
        case bad
    }

    private static let engine = AVAudioEngine()
    private static let player = AVAudioPlayerNode()
    private static var didConfigure = false
    private static let lock = NSLock()

    static func play(_ kind: Kind) {
        fireHaptic(kind)
        lock.lock()
        defer { lock.unlock() }

        do {
            let session = AVAudioSession.sharedInstance()
            // `.playback` ignores the Ring/Silent switch. Camera must not auto-reconfigure
            // the session (see CheckInQRScannerView) or this gets overwritten.
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
            // Fail soft — haptic already fired; check-in UI still works without audio.
        }
    }

    private static func fireHaptic(_ kind: Kind) {
        DispatchQueue.main.async {
            let generator = UINotificationFeedbackGenerator()
            generator.prepare()
            switch kind {
            case .good:
                generator.notificationOccurred(.success)
            case .bad:
                generator.notificationOccurred(.error)
            }
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
                    (freq: 880, duration: 0.07, gain: 0.55),
                    (freq: 0, duration: 0.04, gain: 0),
                    (freq: 1320, duration: 0.11, gain: 0.5),
                ]
            )
        case .bad:
            return compose(
                format: format,
                sampleRate: sampleRate,
                segments: [
                    (freq: 220, duration: 0.22, gain: 0.58),
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
