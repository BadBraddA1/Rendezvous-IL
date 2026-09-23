package com.rendezvousil.app.ui.checkin

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/**
 * Desk check-in tones. Raises alarm/media volume if they’re at zero, plays on the
 * alarm stream, and always vibrates — silence at the desk isn’t useful.
 */
object CheckInBoopPlayer {
    private val handler = Handler(Looper.getMainLooper())

    fun playGood(context: Context) {
        ensureAudibleVolume(context)
        vibrate(context, success = true)
        playTone(ToneGenerator.TONE_PROP_ACK, durationMs = 180)
    }

    fun playBad(context: Context) {
        ensureAudibleVolume(context)
        vibrate(context, success = false)
        playTone(ToneGenerator.TONE_PROP_NACK, durationMs = 280)
    }

    /** Bump alarm + music streams if the user has them muted. */
    private fun ensureAudibleVolume(context: Context) {
        try {
            val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
            for (stream in listOf(AudioManager.STREAM_ALARM, AudioManager.STREAM_MUSIC)) {
                val max = am.getStreamMaxVolume(stream)
                if (max <= 0) continue
                val desired = (max * 0.55f).toInt().coerceAtLeast(1)
                if (am.getStreamVolume(stream) < desired) {
                    // flags=0 — no system volume toast
                    am.setStreamVolume(stream, desired, 0)
                }
            }
        } catch (_: Exception) {
            // Fail soft
        }
    }

    private fun playTone(tone: Int, durationMs: Int) {
        try {
            val generator = ToneGenerator(AudioManager.STREAM_ALARM, 100)
            generator.startTone(tone, durationMs)
            handler.postDelayed({
                runCatching { generator.release() }
            }, durationMs + 80L)
        } catch (_: Exception) {
            // Fail soft — vibrate already attempted.
        }
    }

    private fun vibrate(context: Context, success: Boolean) {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                context.getSystemService(VibratorManager::class.java)?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Vibrator::class.java)
            } ?: return

            if (!vibrator.hasVibrator()) return

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val timings = if (success) longArrayOf(0, 50, 40, 50, 40, 50) else longArrayOf(0, 220)
                val amplitudes = if (success) {
                    intArrayOf(0, 255, 0, 255, 0, 255)
                } else {
                    intArrayOf(0, 255)
                }
                vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(if (success) 120 else 220)
            }
        } catch (_: Exception) {
            // Fail soft
        }
    }
}
