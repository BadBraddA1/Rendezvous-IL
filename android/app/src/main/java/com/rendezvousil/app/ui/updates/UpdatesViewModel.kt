package com.rendezvousil.app.ui.updates

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.core.network.RendezvousRepository
import com.rendezvousil.core.network.dto.WeatherPayload
import com.rendezvousil.core.schedule.model.Announcement
import com.rendezvousil.core.schedule.model.NowNextResult
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class UpdatesViewModel(
    private val repository: RendezvousRepository,
) : ViewModel() {
    val liveAnnouncements: StateFlow<List<Announcement>> = repository.liveAnnouncements
    val weather: StateFlow<WeatherPayload?> = repository.weather

    fun nowNext(): NowNextResult = repository.nowNext()

    init {
        viewModelScope.launch { repository.loadUpdates() }
    }

    fun refresh() {
        viewModelScope.launch { repository.loadUpdates() }
    }
}
