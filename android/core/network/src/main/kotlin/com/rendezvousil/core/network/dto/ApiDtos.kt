package com.rendezvousil.core.network.dto

import com.rendezvousil.core.schedule.model.Announcement
import com.rendezvousil.core.schedule.model.Meal
import com.rendezvousil.core.schedule.model.Rate
import com.rendezvousil.core.schedule.model.VolunteerScheduleSlot
import kotlinx.serialization.Serializable

@Serializable
data class MealsResponse(
    val meals: List<Meal>? = null,
)

@Serializable
data class AnnouncementsResponse(
    val announcements: List<Announcement>? = null,
)

@Serializable
data class VolunteerWeekResponse(
    val schedules: Map<String, VolunteerScheduleSlot>? = null,
)

@Serializable
data class ScheduleAnnouncementsResponse(
    val announcements: List<Announcement>? = null,
)

@Serializable
data class WeatherPayload(
    val current: WeatherCurrent? = null,
    val hourly: List<WeatherHour>? = null,
    val error: String? = null,
)

@Serializable
data class WeatherCurrent(
    val temp: Double,
    val feels_like: Double,
    val humidity: Int,
    val weather: List<WeatherCondition>,
    val wind_speed: Double,
)

@Serializable
data class WeatherHour(
    val dt: Int,
    val temp: Double,
    val feels_like: Double,
    val humidity: Int,
    val weather: List<WeatherCondition>,
    val pop: Double,
    val wind_speed: Double,
)

@Serializable
data class WeatherCondition(
    val main: String,
    val description: String,
    val icon: String,
)

@Serializable
data class RatesPayload(
    val rateChart: RateChart? = null,
    val rates: Map<String, List<Rate>>? = null,
    val registrationFee: Double? = null,
    val isLateRegistration: Boolean? = null,
    val error: String? = null,
)

@Serializable
data class RateChart(
    val year: Int,
    val is_active: Boolean? = null,
)
