package com.rendezvousil.app.ui.checkin

import android.content.Context
import android.media.AudioAttributes
import android.media.ToneGenerator
import android.media.AudioManager
import android.os.Handler
import android.os.Looper

/**
 * Short success/fail tones that try to play even when the ringer is silent
 * (STREAM_MUSIC / USAGE_ASSISTANCE_SONIFICATION).
 */
object CheckInBoopPlayer {
    private val handler = Handler(Looper.getMainLooper())

    fun playGood(context: Context) {
        playTone(ToneGenerator.TONE_PROP_ACK, durationMs = 180)
    }

    fun playBad(context: Context) {
        playTone(ToneGenerator.TONE_PROP_NACK, durationMs = 280)
    }

    private fun playTone(tone: Int, durationMs: Int) {
        try {
            // STREAM_MUSIC typically still audible when ringer is silent.
            val generator = ToneGenerator(AudioManager.STREAM_MUSIC, 90)
            generator.startTone(tone, durationMs)
            handler.postDelayed({
                runCatching { generator.release() }
            }, durationMs + 80L)
        } catch (_: Exception) {
            // Fail soft
        }
    }

    @Suppress("UNUSED_PARAMETER")
    fun ensureAudioFocus(context: Context) {
        // Reserved if we later switch to AudioTrack / MediaPlayer assets.
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        attrs.toString()
    }
}
