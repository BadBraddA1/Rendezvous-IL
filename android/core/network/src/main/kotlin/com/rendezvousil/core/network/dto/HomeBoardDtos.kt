package com.rendezvousil.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class HomeBoardSection(
    val id: String,
    val type: String,
    val enabled: Boolean = true,
    val title: String? = null,
    val body: String? = null,
    val linkUrl: String? = null,
    val linkLabel: String? = null,
)

@Serializable
data class HomeBoardConfig(
    val eventYear: Int,
    val sections: List<HomeBoardSection> = emptyList(),
)

@Serializable
data class FamilyCheckInResponse(
    val eventYear: Int,
    val hasRegistration: Boolean = false,
    val checkedIn: Boolean = false,
    val checkedInAt: String? = null,
    val lodgingType: String? = null,
    val roomKeys: List<String> = emptyList(),
    val familyLastName: String? = null,
    val attendeeCount: Int? = null,
    val message: String? = null,
) {
    val lodgingLabel: String?
        get() {
            val raw = lodgingType?.trim().orEmpty()
            if (raw.isEmpty()) return null
            return when (raw.lowercase()) {
                "motel" -> "Motel"
                "rv" -> "RV"
                "tent" -> "Tent"
                "drivein" -> "Drive-in"
                else -> raw.replaceFirstChar { it.uppercase() }
            }
        }
}
