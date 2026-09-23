package com.rendezvousil.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class WebHandoffRequest(
    val redirect_url: String,
)

@Serializable
data class WebHandoffResponse(
    val url: String,
    val expiresInSeconds: Int? = null,
)
