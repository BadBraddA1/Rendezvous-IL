package com.rendezvousil.app.notifications

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions

object FirebaseAppHolder {
    var isInitialized: Boolean = false
        private set

    /**
     * Initializes Firebase when `google-services.json` is present (Gradle plugin) or when
     * manual options are supplied via `local.properties`:
     * `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, `FIREBASE_API_KEY`, `FIREBASE_GCM_SENDER_ID`.
     */
    fun initialize(context: Context, manualOptions: ManualFirebaseOptions?) {
        if (FirebaseApp.getApps(context).isNotEmpty()) {
            isInitialized = true
            return
        }

        val result = runCatching {
            if (manualOptions != null) {
                val options = FirebaseOptions.Builder()
                    .setProjectId(manualOptions.projectId)
                    .setApplicationId(manualOptions.appId)
                    .setApiKey(manualOptions.apiKey)
                    .setGcmSenderId(manualOptions.gcmSenderId)
                    .build()
                FirebaseApp.initializeApp(context, options)
            } else {
                FirebaseApp.initializeApp(context)
            }
        }
        isInitialized = result.isSuccess
    }

    data class ManualFirebaseOptions(
        val projectId: String,
        val appId: String,
        val apiKey: String,
        val gcmSenderId: String,
    )
}
