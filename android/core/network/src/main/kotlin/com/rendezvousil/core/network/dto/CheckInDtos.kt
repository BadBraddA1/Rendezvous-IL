package com.rendezvousil.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class CheckInRegistrationSummary(
    val id: Int,
    val family_last_name: String,
    val email: String? = null,
    val lodging_type: String? = null,
    val checked_in: Boolean? = null,
)

@Serializable
data class CheckInRegistration(
    val id: Int,
    val family_last_name: String,
    val email: String? = null,
    val husband_phone: String? = null,
    val wife_phone: String? = null,
    val lodging_type: String? = null,
    val checkin_qr_code: String? = null,
    val checked_in: Boolean? = null,
    val checked_in_at: String? = null,
    val pre_assigned_keys: List<String>? = null,
    val tshirts_distributed: Boolean? = null,
    val full_payment_paid: Boolean? = null,
    val registration_fee_paid: Boolean? = null,
)

@Serializable
data class CheckInFamilyMember(
    val id: Int,
    val first_name: String,
    val last_name: String? = null,
    val age: Int? = null,
)

@Serializable
data class CheckInTshirtOrder(
    val id: Int,
    val size: String? = null,
    val color: String? = null,
    val quantity: Int? = null,
)

@Serializable
data class CheckInLookupResponse(
    val registration: CheckInRegistration,
    val family_members: List<CheckInFamilyMember>? = null,
    val tshirt_orders: List<CheckInTshirtOrder>? = null,
)

@Serializable
data class CheckInFullResponse(
    val registration: CheckInRegistration,
    val family_members: List<CheckInFamilyMember>? = null,
    val tshirt_orders: List<CheckInTshirtOrder>? = null,
)

@Serializable
data class CheckInSubmitBody(
    val room_keys: List<String>,
    val tshirts_distributed: Boolean,
)

@Serializable
data class CheckInMutationResponse(
    val success: Boolean? = null,
    val registration: CheckInRegistration? = null,
)

@Serializable
data class CheckInUndoResponse(
    val success: Boolean? = null,
)
