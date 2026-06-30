package com.rendezvousil.core.network

sealed class ApiException(message: String, cause: Throwable? = null) : Exception(message, cause) {
    class InvalidUrl(message: String = "Invalid URL") : ApiException(message)
    class Unauthorized(message: String = "Sign in required") : ApiException(message)
    class BadStatus(val code: Int) : ApiException("Server returned $code")
    class Decoding(cause: Throwable) : ApiException(
        "Could not read response: ${cause.message}",
        cause,
    )
}
