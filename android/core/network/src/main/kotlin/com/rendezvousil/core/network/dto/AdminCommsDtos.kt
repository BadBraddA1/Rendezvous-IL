package com.rendezvousil.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class AdminAnnouncementItem(
    val id: Int,
    val title: String,
    val message: String,
    val priority: String,
    val is_active: Boolean,
    val show_on_live_updates: Boolean? = null,
    val show_on_schedule: Boolean? = null,
    val send_push: Boolean? = null,
    val publish_at: String? = null,
    val push_sent_at: String? = null,
    val schedule_event_id: Int? = null,
    val created_at: String? = null,
)

@Serializable
data class AdminAnnouncementsListResponse(
    val announcements: List<AdminAnnouncementItem>? = null,
)

@Serializable
data class AdminCreateAnnouncementBody(
    val title: String,
    val message: String,
    val priority: String = "normal",
    val showOnLiveUpdates: Boolean = true,
    val showOnSchedule: Boolean = false,
    val sendPush: Boolean = false,
    val publishAt: String? = null,
)

@Serializable
data class AdminAnnouncementActiveBody(
    val is_active: Boolean,
)

@Serializable
data class AdminCreateAnnouncementResponse(
    val success: Boolean? = null,
    val announcement: AdminAnnouncementItem? = null,
    val message: String? = null,
    val push: AdminPushResponse? = null,
)

@Serializable
data class AdminPushResponse(
    val success: Boolean? = null,
    val recipients: Int? = null,
    val channel: String? = null,
    val error: String? = null,
)

@Serializable
data class AdminScheduleEventRow(
    val id: Int,
    val day: String,
    val event_date: String? = null,
    val time: String,
    val title: String,
    val location: String? = null,
)

@Serializable
data class AdminScheduleEventsResponse(
    val events: List<AdminScheduleEventRow>? = null,
)

@Serializable
data class AdminEventPingBody(
    val mode: String,
    val minutesBefore: Int? = null,
    val title: String? = null,
    val message: String? = null,
    val showOnLiveUpdates: Boolean = true,
    val showOnSchedule: Boolean = false,
)

@Serializable
data class AdminEventPingResponse(
    val success: Boolean? = null,
    val announcement: AdminAnnouncementItem? = null,
    val push: AdminPushResponse? = null,
)

@Serializable
data class AdminDirectoryPhotoUploadResponse(
    val success: Boolean? = null,
    val photo_url: String? = null,
)
