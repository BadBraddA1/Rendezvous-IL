package com.rendezvousil.app.notifications

import android.content.Context
import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import com.rendezvousil.app.BuildConfig
import com.rendezvousil.core.network.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

class FcmRegistrationService(
    private val context: Context,
    private val apiClient: ApiClient,
    private val notificationPreferences: NotificationPreferences,
) {
    private var lastRegisteredToken: String? = null

    suspend fun registerIfEnabled() {
        if (!notificationPreferences.broadcastAlertsEnabled) return
        if (!NotificationHelper.areNotificationsEnabled(context)) return
        if (!FirebaseAppHolder.isInitialized) return

        runCatching {
            val token = FirebaseMessaging.getInstance().token.await()
            if (token == lastRegisteredToken) return
            registerToken(token)
            lastRegisteredToken = token
        }.onFailure { error ->
            Log.w(TAG, "FCM token registration failed: ${error.message}")
        }
    }

    suspend fun unregisterCurrentToken() {
        if (!FirebaseAppHolder.isInitialized) return
        runCatching {
            val token = FirebaseMessaging.getInstance().token.await()
            unregisterToken(token)
            lastRegisteredToken = null
        }.onFailure { error ->
            Log.w(TAG, "FCM token unregister failed: ${error.message}")
        }
    }

    suspend fun onBroadcastAlertsToggled(enabled: Boolean) {
        if (enabled) {
            registerIfEnabled()
        } else {
            unregisterCurrentToken()
        }
    }

    private suspend fun registerToken(token: String) = withContext(Dispatchers.IO) {
        val body = RegisterBody(
            token = token,
            bundleId = BuildConfig.APPLICATION_ID,
            platform = "android",
        )
        val request = Request.Builder()
            .url(apiClient.urlFor("api/push/register"))
            .post(
                ApiClient.json.encodeToString(body)
                    .toRequestBody("application/json".toMediaType()),
            )
            .build()
        apiClient.okHttpClient.newCall(request).execute().close()
    }

    private suspend fun unregisterToken(token: String) = withContext(Dispatchers.IO) {
        val body = UnregisterBody(token = token)
        val request = Request.Builder()
            .url(apiClient.urlFor("api/push/register"))
            .method(
                "DELETE",
                ApiClient.json.encodeToString(body)
                    .toRequestBody("application/json".toMediaType()),
            )
            .build()
        apiClient.okHttpClient.newCall(request).execute().close()
    }

    @Serializable
    private data class RegisterBody(
        val token: String,
        val bundleId: String,
        val platform: String,
    )

    @Serializable
    private data class UnregisterBody(
        val token: String,
        val platform: String = "android",
    )

    companion object {
        private const val TAG = "FcmRegistration"
    }
}
