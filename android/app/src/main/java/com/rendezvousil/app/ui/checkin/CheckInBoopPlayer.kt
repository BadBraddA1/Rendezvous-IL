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
 * Desk check-in tones. Plays on the alarm stream + vibrates.
 * Does **not** change system volume (that flashes the volume UI).
 * Returns true when volume is too low to hear — callers should show a mute banner.
 */
object CheckInBoopPlayer {
    private val handler = Handler(Looper.getMainLooper())

    /** @return true if a mute fallback banner should be shown */
    fun playGood(context: Context): Boolean {
        val needsBanner = !isAudible(context)
        vibrate(context, success = true)
        playTone(ToneGenerator.TONE_PROP_ACK, durationMs = 180)
        return needsBanner
    }

    /** @return true if a mute fallback banner should be shown */
    fun playBad(context: Context): Boolean {
        val needsBanner = !isAudible(context)
        vibrate(context, success = false)
        playTone(ToneGenerator.TONE_PROP_NACK, durationMs = 280)
        return needsBanner
    }

    private fun isAudible(context: Context): Boolean {
        return try {
            val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return true
            val alarm = am.getStreamVolume(AudioManager.STREAM_ALARM)
            val music = am.getStreamVolume(AudioManager.STREAM_MUSIC)
            alarm > 0 || music > 0
        } catch (_: Exception) {
            true
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
            // Fail soft
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
