package com.rendezvousil.app.auth

import android.content.Context
import android.content.Intent
import android.net.Uri

object WebLinks {
    fun url(baseUrl: String, path: String): String {
        val base = baseUrl.trimEnd('/')
        val normalized = if (path.startsWith("/")) path else "/$path"
        return base + normalized
    }

    fun open(context: Context, url: String) {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
    }
}
