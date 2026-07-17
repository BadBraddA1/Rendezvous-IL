package com.rendezvousil.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class DirectoryContactPhone(
    val member_id: Int? = null,
    val name: String = "",
    val phone: String = "",
)

@Serializable
data class DirectoryMember(
    val name: String = "",
    /** father | mother | child */
    val role: String = "child",
    val age: Int? = null,
    val is_adult: Boolean = false,
    val email: String? = null,
    val phone: String? = null,
) {
    val ageLabel: String?
        get() = when {
            is_adult -> "Adult"
            age != null -> age.toString()
            else -> null
        }
}

@Serializable
data class DirectoryFamily(
    val id: Int,
    val family_last_name: String,
    val home_congregation: String? = null,
    val city: String? = null,
    val state: String? = null,
    /** Prefers "City, ST" for directory cards. */
    val city_state: String? = null,
    val photo_url: String? = null,
    val directory_blurb: String? = null,
    val husband_first_name: String? = null,
    val wife_first_name: String? = null,
    val email: String? = null,
    val formatted_address: String? = null,
    val contact_phones: List<DirectoryContactPhone> = emptyList(),
    val member_count: Int = 0,
    val member_names: List<String> = emptyList(),
    val members: List<DirectoryMember> = emptyList(),
) {
    val displayLocation: String?
        get() {
            city_state?.takeIf { it.isNotBlank() }?.let { return it }
            val cityPart = city?.trim().orEmpty()
            val statePart = state?.trim().orEmpty()
            return when {
                cityPart.isNotEmpty() && statePart.isNotEmpty() -> "$cityPart, $statePart"
                cityPart.isNotEmpty() -> cityPart
                statePart.isNotEmpty() -> statePart
                else -> null
            }
        }
}

@Serializable
data class DirectoryResponse(
    val year: Int,
    val hasAccess: Boolean? = null,
    val families: List<DirectoryFamily> = emptyList(),
)

@Serializable
data class DirectoryYearsResponse(
    val years: List<Int> = emptyList(),
)

@Serializable
data class FamilyDirectorySettings(
    val photo_url: String? = null,
    val directory_opt_in: Boolean = true,
    val directory_blurb: String? = null,
    val photo_updated_at: String? = null,
)

@Serializable
data class FamilyDirectorySettingsEnvelope(
    val settings: FamilyDirectorySettings,
)

@Serializable
data class FamilyDirectorySettingsResponse(
    val success: Boolean? = null,
    val settings: FamilyDirectorySettings,
)

@Serializable
data class FamilyDirectorySettingsBody(
    val directory_opt_in: Boolean,
    val directory_blurb: String? = null,
)
