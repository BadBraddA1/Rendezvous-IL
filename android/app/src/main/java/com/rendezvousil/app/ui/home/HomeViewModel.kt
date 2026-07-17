package com.rendezvousil.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.core.network.RendezvousRepository
import com.rendezvousil.core.network.dto.FamilyVolunteeringResponse
import com.rendezvousil.core.network.dto.WeatherPayload
import com.rendezvousil.core.schedule.MealMatcher
import com.rendezvousil.core.schedule.ScheduleNowNext
import com.rendezvousil.core.schedule.model.Announcement
import com.rendezvousil.core.schedule.model.NowNextResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class HomeUiState(
    val chatUnreadTotal: Int = 0,
    val nextMealLine: String? = null,
    val volunteering: FamilyVolunteeringResponse? = null,
)

class HomeViewModel(
    private val repository: RendezvousRepository,
    private val appSession: AppSession,
) : ViewModel() {
    val liveAnnouncements: StateFlow<List<Announcement>> = repository.liveAnnouncements
    val weather: StateFlow<WeatherPayload?> = repository.weather

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    fun nowNext(): NowNextResult = repository.nowNext()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            repository.loadUpdates()
            if (repository.schedule.value == null) {
                repository.loadScheduleBundle()
            }
            repository.loadScheduleExtras()
            loadVolunteering()
            loadChatUnread()
            _uiState.update { it.copy(nextMealLine = computeNextMealLine()) }
        }
    }

    private suspend fun loadVolunteering() {
        val client = appSession.authenticatedApiClient ?: run {
            _uiState.update { it.copy(volunteering = null) }
            return
        }
        _uiState.update {
            it.copy(volunteering = runCatching { client.getFamilyVolunteering() }.getOrNull())
        }
    }

    private suspend fun loadChatUnread() {
        val client = appSession.authenticatedApiClient ?: run {
            _uiState.update { it.copy(chatUnreadTotal = 0) }
            return
        }
        val total = runCatching {
            client.getChatChannels().channels.sumOf { maxOf(0, it.unread_count ?: 0) }
        }.getOrDefault(_uiState.value.chatUnreadTotal)
        _uiState.update { it.copy(chatUnreadTotal = total) }
    }

    private fun computeNextMealLine(): String? {
        val result = repository.nowNext()
        val items = repository.schedule.value?.luItems.orEmpty()
        val mealEvent = when {
            result.current?.isMeal == true -> result.current
            result.next?.isMeal == true -> result.next
            else -> {
                val today = ScheduleNowNext.chicagoISODate()
                items.firstOrNull { it.isMeal == true && it.date >= today }
            }
        } ?: return null

        val mealType = MealMatcher.mealTypeFor(mealEvent.title)
        val meal = mealType?.let { type ->
            repository.meals.value.firstOrNull { it.date == mealEvent.date && it.meal_type == type }
        }
        val dish = meal?.main_dish?.trim().orEmpty()
        val label = if (dish.isNotEmpty()) "${mealEvent.title}: $dish" else mealEvent.title
        return listOf(mealEvent.day, mealEvent.time, label).joinToString(" · ")
    }
}
