package com.rendezvousil.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class FamilyVolunteeringPendingAction(
    val type: String = "",
    val label: String = "",
    val href: String = "",
)

@Serializable
data class FamilyVolunteeringWorship(
    val assignedDate: String? = null,
    val timeSlot: String? = null,
    val prayerType: String? = null,
    val roleLabel: String = "",
    val scheduleStatus: String? = null,
    val startsAt: String? = null,
)

@Serializable
data class FamilyVolunteeringLesson(
    val topicId: Int = 0,
    val topicTitle: String = "",
    val lessonTitle: String? = null,
    val scriptureReading: String? = null,
)

@Serializable
data class FamilyVolunteeringLessonSlides(
    val fileName: String = "",
    val fileUrl: String = "",
    val fileType: String = "",
    val byteSize: Int = 0,
    val updatedAt: String = "",
)

@Serializable
data class FamilyVolunteerSongPick(
    val title: String = "",
    val versesLabel: String = "",
)

@Serializable
data class FamilyVolunteerSongSet(
    val songs: List<FamilyVolunteerSongPick> = emptyList(),
    val note: String? = null,
    val updatedAt: String = "",
)

@Serializable
data class FamilyVolunteerEntry(
    val id: Int,
    val volunteerName: String = "",
    val volunteerType: String = "",
    val worshipAssignment: FamilyVolunteeringWorship? = null,
    val lessonTopic: FamilyVolunteeringLesson? = null,
    val lessonSlides: FamilyVolunteeringLessonSlides? = null,
    val songSet: FamilyVolunteerSongSet? = null,
    val pendingActions: List<FamilyVolunteeringPendingAction> = emptyList(),
)

@Serializable
data class LessonSlideUploadResponse(
    val slide: LessonSlideUploaded? = null,
    val error: String? = null,
)

@Serializable
data class LessonSlideUploaded(
    val id: String = "",
    val file_name: String? = null,
    val file_url: String? = null,
)

@Serializable
data class FamilySpecialAssignment(
    val id: Int,
    val activityName: String = "",
    val assignedDate: String? = null,
    val timeSlot: String? = null,
    val notes: String? = null,
    val matchedName: String = "",
    val startsAt: String? = null,
)

@Serializable
data class FamilyVolunteeringSummary(
    val pendingActionCount: Int = 0,
    val confirmedWorshipCount: Int = 0,
    val specialAssignmentCount: Int = 0,
)

@Serializable
data class FamilyVolunteeringResponse(
    val eventYear: Int = 2027,
    val registrationId: Int? = null,
    val volunteers: List<FamilyVolunteerEntry> = emptyList(),
    val specialAssignments: List<FamilySpecialAssignment> = emptyList(),
    val summary: FamilyVolunteeringSummary = FamilyVolunteeringSummary(),
    val hasContent: Boolean = false,
)
