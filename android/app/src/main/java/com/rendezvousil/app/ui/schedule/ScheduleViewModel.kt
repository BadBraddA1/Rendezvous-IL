package com.rendezvousil.app.ui.schedule

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.app.notifications.ReminderService
import com.rendezvousil.core.network.RendezvousRepository
import com.rendezvousil.core.schedule.model.Announcement
import com.rendezvousil.core.schedule.model.Meal
import com.rendezvousil.core.schedule.model.SchedulePayload
import com.rendezvousil.core.schedule.model.VolunteerScheduleSlot
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ScheduleViewModel(
    private val repository: RendezvousRepository,
    private val reminderService: ReminderService,
) : ViewModel() {
    val schedule: StateFlow<SchedulePayload?> = repository.schedule
    val scheduleAnnouncements: StateFlow<List<Announcement>> = repository.scheduleAnnouncements
    val isLoadingSchedule: StateFlow<Boolean> = repository.isLoadingSchedule
    val scheduleError: StateFlow<String?> = repository.scheduleError

    init {
        viewModelScope.launch {
            schedule.collect { payload ->
                if (payload != null) {
                    reminderService.rescheduleAll(payload.luItems)
                }
            }
        }
    }

    fun meal(date: String, mealType: String): Meal? = repository.meal(date, mealType)

    fun volunteers(date: String, timeSlot: String): VolunteerScheduleSlot? =
        repository.volunteers(date, timeSlot)

    fun refresh() {
        viewModelScope.launch {
            repository.loadScheduleBundle()
            repository.loadScheduleExtras()
        }
    }
}
