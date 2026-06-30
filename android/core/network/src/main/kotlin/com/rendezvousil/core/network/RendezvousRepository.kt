package com.rendezvousil.core.network

import com.rendezvousil.core.network.dto.RatesPayload
import com.rendezvousil.core.network.dto.WeatherPayload
import com.rendezvousil.core.schedule.ScheduleNowNext
import com.rendezvousil.core.schedule.model.Announcement
import com.rendezvousil.core.schedule.model.Meal
import com.rendezvousil.core.schedule.model.NowNextResult
import com.rendezvousil.core.schedule.model.SchedulePayload
import com.rendezvousil.core.schedule.model.VolunteerScheduleSlot
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class RendezvousRepository(
    private val apiClient: ApiClient,
    private val fallbackLoader: ScheduleFallbackLoader? = null,
    private val onScheduleSynced: ((SchedulePayload?) -> Unit)? = null,
) {
    private val _schedule = MutableStateFlow<SchedulePayload?>(null)
    val schedule: StateFlow<SchedulePayload?> = _schedule.asStateFlow()

    private val _meals = MutableStateFlow<List<Meal>>(emptyList())
    val meals: StateFlow<List<Meal>> = _meals.asStateFlow()

    private val _volunteerSchedules = MutableStateFlow<Map<String, VolunteerScheduleSlot>>(emptyMap())
    val volunteerSchedules: StateFlow<Map<String, VolunteerScheduleSlot>> =
        _volunteerSchedules.asStateFlow()

    private val _liveAnnouncements = MutableStateFlow<List<Announcement>>(emptyList())
    val liveAnnouncements: StateFlow<List<Announcement>> = _liveAnnouncements.asStateFlow()

    private val _scheduleAnnouncements = MutableStateFlow<List<Announcement>>(emptyList())
    val scheduleAnnouncements: StateFlow<List<Announcement>> = _scheduleAnnouncements.asStateFlow()

    private val _weather = MutableStateFlow<WeatherPayload?>(null)
    val weather: StateFlow<WeatherPayload?> = _weather.asStateFlow()

    private val _rates = MutableStateFlow<RatesPayload?>(null)
    val rates: StateFlow<RatesPayload?> = _rates.asStateFlow()

    private val _isLoadingSchedule = MutableStateFlow(false)
    val isLoadingSchedule: StateFlow<Boolean> = _isLoadingSchedule.asStateFlow()

    private val _scheduleError = MutableStateFlow<String?>(null)
    val scheduleError: StateFlow<String?> = _scheduleError.asStateFlow()

    suspend fun loadScheduleBundle() {
        _isLoadingSchedule.value = true
        _scheduleError.value = null
        try {
            _schedule.value = apiClient.getSchedule()
            syncSharedSnapshot()
        } catch (error: Exception) {
            val bundled = fallbackLoader?.loadBundledSchedule()
            if (bundled != null) {
                _schedule.value = bundled
                _scheduleError.value = null
                syncSharedSnapshot()
            } else {
                _scheduleError.value = error.message
            }
        } finally {
            _isLoadingSchedule.value = false
        }
    }

    suspend fun loadScheduleExtras() = coroutineScope {
        val mealsTask = async { fetchMeals() }
        val volunteerTask = async { fetchVolunteers() }
        val scheduleAnnouncementsTask = async { fetchScheduleAnnouncements() }
        mealsTask.await()
        volunteerTask.await()
        scheduleAnnouncementsTask.await()
    }

    suspend fun loadUpdates() = coroutineScope {
        val announcementsTask = async { fetchLiveAnnouncements() }
        val weatherTask = async { fetchWeather() }
        announcementsTask.await()
        weatherTask.await()
        if (_schedule.value == null) {
            loadScheduleBundle()
        } else {
            syncSharedSnapshot()
        }
    }

    suspend fun loadRates() {
        _rates.value = try {
            apiClient.getRates(year = AppConfig.EVENT_YEAR)
        } catch (_: Exception) {
            null
        }
    }

    fun meal(date: String, mealType: String): Meal? =
        _meals.value.firstOrNull { it.date == date && it.meal_type == mealType }

    fun volunteers(date: String, timeSlot: String): VolunteerScheduleSlot? =
        _volunteerSchedules.value["$date|$timeSlot"]

    fun nowNext(): NowNextResult {
        val items = _schedule.value?.luItems ?: return NowNextResult()
        return ScheduleNowNext.evaluate(items)
    }

    private fun syncSharedSnapshot() {
        onScheduleSynced?.invoke(_schedule.value)
    }

    private suspend fun fetchMeals() {
        _meals.value = try {
            apiClient.getMeals().meals.orEmpty()
        } catch (_: Exception) {
            emptyList()
        }
    }

    private suspend fun fetchVolunteers() {
        _volunteerSchedules.value = try {
            apiClient.getVolunteerSchedule().schedules.orEmpty()
        } catch (_: Exception) {
            emptyMap()
        }
    }

    private suspend fun fetchLiveAnnouncements() {
        _liveAnnouncements.value = try {
            apiClient.getAnnouncements().announcements.orEmpty()
        } catch (_: Exception) {
            emptyList()
        }
    }

    private suspend fun fetchScheduleAnnouncements() {
        _scheduleAnnouncements.value = try {
            apiClient.getScheduleAnnouncements().announcements.orEmpty()
        } catch (_: Exception) {
            emptyList()
        }
    }

    private suspend fun fetchWeather() {
        _weather.value = try {
            apiClient.getWeather()
        } catch (_: Exception) {
            null
        }
    }
}
