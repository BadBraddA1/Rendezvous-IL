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

@Serializable
data class YearHubMember(
    val id: Int,
    val firstName: String,
    val lastName: String,
)

@Serializable
data class YearHubFamily(
    val id: Int,
    val lastName: String,
    val email: String? = null,
    val city: String? = null,
    val state: String? = null,
    val homeCongregation: String? = null,
    val members: List<YearHubMember> = emptyList(),
)

@Serializable
data class YearHubRegistration(
    val id: Int,
    val familyLastName: String,
    val lodgingType: String? = null,
    val attendeeCount: Int? = null,
    val checkedIn: Boolean = false,
    val totalCost: Double? = null,
    val paymentStatus: String? = null,
)

@Serializable
data class YearHubVolunteerRow(
    val id: Int,
    val volunteerName: String,
    val volunteerType: String,
    val roleLabel: String? = null,
)

@Serializable
data class YearHubVolunteering(
    val hasContent: Boolean = false,
    val volunteers: List<YearHubVolunteerRow> = emptyList(),
    val specialAssignmentCount: Int = 0,
    val nextUp: YearHubNextUp? = null,
)

@Serializable
data class YearHubNextUp(
    val kind: String,
    val personName: String,
    val eventLabel: String,
    val whenLabel: String,
    val startsAt: String? = null,
)

@Serializable
data class YearHubLinks(
    val profile: String,
    val account: String,
    val chat: String,
    val registration: String,
    val about: String,
    val schedule: String,
)

@Serializable
data class YearHubResponse(
    val eventYear: Int,
    val hasFamily: Boolean = false,
    val hasRegistration: Boolean = false,
    val registrationOpen: Boolean = false,
    val isRetreatWeek: Boolean = false,
    val preferSeasonHub: Boolean = true,
    val message: String? = null,
    val registerUrl: String,
    val family: YearHubFamily? = null,
    val registration: YearHubRegistration? = null,
    val volunteering: YearHubVolunteering? = null,
    val links: YearHubLinks,
)
