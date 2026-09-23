package com.rendezvousil.app.auth

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.rendezvousil.core.network.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object WebLinks {
    fun url(baseUrl: String, path: String): String {
        val base = baseUrl.trimEnd('/')
        val normalized = if (path.startsWith("/")) path else "/$path"
        return base + normalized
    }

    fun open(context: Context, url: String) {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
    }

    /**
     * Open a site path already signed in via Clerk sign-in token handoff.
     * Falls back to a plain URL if the client is missing or minting fails.
     */
    suspend fun openAuthenticated(
        context: Context,
        baseUrl: String,
        path: String,
        client: ApiClient?,
    ) {
        val fallback = url(baseUrl, path)
        if (client == null) {
            withContext(Dispatchers.Main) { open(context, fallback) }
            return
        }
        try {
            val response = client.createWebHandoff(path)
            withContext(Dispatchers.Main) {
                open(context, response.url.ifBlank { fallback })
            }
        } catch (_: Exception) {
            withContext(Dispatchers.Main) { open(context, fallback) }
        }
    }
}
