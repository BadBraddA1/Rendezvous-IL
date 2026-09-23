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
 * Short success/fail tones that stay audible when media/ringer are quiet.
 *
 * Uses STREAM_ALARM (desk-style alert volume) plus a haptic pulse so staff
 * still get feedback if every volume slider is at zero.
 */
object CheckInBoopPlayer {
    private val handler = Handler(Looper.getMainLooper())

    fun playGood(context: Context) {
        vibrate(context, success = true)
        playTone(ToneGenerator.TONE_PROP_ACK, durationMs = 180)
    }

    fun playBad(context: Context) {
        vibrate(context, success = false)
        playTone(ToneGenerator.TONE_PROP_NACK, durationMs = 280)
    }

    private fun playTone(tone: Int, durationMs: Int) {
        try {
            // Alarm stream is independent of media/ringer mute on most devices.
            val generator = ToneGenerator(AudioManager.STREAM_ALARM, 100)
            generator.startTone(tone, durationMs)
            handler.postDelayed({
                runCatching { generator.release() }
            }, durationMs + 80L)
        } catch (_: Exception) {
            // Fail soft — haptic already attempted.
        }
    }

    private fun vibrate(context: Context, success: Boolean) {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val manager = context.getSystemService(VibratorManager::class.java)
                manager?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Vibrator::class.java)
            } ?: return

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val effect = if (success) {
                    VibrationEffect.createWaveform(longArrayOf(0, 40, 40, 40), -1)
                } else {
                    VibrationEffect.createOneShot(160, VibrationEffect.DEFAULT_AMPLITUDE)
                }
                vibrator.vibrate(effect)
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(if (success) 80 else 160)
            }
        } catch (_: Exception) {
            // Fail soft
        }
    }
}
