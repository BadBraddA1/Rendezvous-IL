package com.rendezvousil.app.di

import android.app.Application
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.app.notifications.ReminderService
import com.rendezvousil.app.ui.admin.AdminUsersViewModel
import com.rendezvousil.app.ui.admin.AdminDashboardViewModel
import com.rendezvousil.app.ui.calculator.CalculatorViewModel
import com.rendezvousil.app.ui.chat.ChatListViewModel
import com.rendezvousil.app.ui.chat.ChatThreadViewModel
import com.rendezvousil.app.ui.checkin.CheckInViewModel
import com.rendezvousil.app.ui.directory.DirectoryManageViewModel
import com.rendezvousil.app.ui.directory.DirectoryViewModel
import com.rendezvousil.app.ui.schedule.ScheduleViewModel
import com.rendezvousil.app.ui.updates.UpdatesViewModel
import com.rendezvousil.core.network.RendezvousRepository
import androidx.lifecycle.createSavedStateHandle
import androidx.lifecycle.viewmodel.CreationExtras

class RendezvousViewModelFactory(
    private val repository: RendezvousRepository,
    private val appSession: AppSession,
    private val application: Application,
    private val reminderService: ReminderService,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return create(modelClass, CreationExtras.Empty)
    }

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>, extras: CreationExtras): T {
        return when {
            modelClass.isAssignableFrom(ScheduleViewModel::class.java) ->
                ScheduleViewModel(repository, reminderService) as T
            modelClass.isAssignableFrom(UpdatesViewModel::class.java) ->
                UpdatesViewModel(repository) as T
            modelClass.isAssignableFrom(CalculatorViewModel::class.java) ->
                CalculatorViewModel(repository) as T
            modelClass.isAssignableFrom(ChatListViewModel::class.java) ->
                ChatListViewModel(appSession) as T
            modelClass.isAssignableFrom(ChatThreadViewModel::class.java) ->
                ChatThreadViewModel(appSession, extras.createSavedStateHandle()) as T
            modelClass.isAssignableFrom(DirectoryViewModel::class.java) ->
                DirectoryViewModel(appSession) as T
            modelClass.isAssignableFrom(DirectoryManageViewModel::class.java) ->
                DirectoryManageViewModel(appSession, application.contentResolver) as T
            modelClass.isAssignableFrom(AdminDashboardViewModel::class.java) ->
                AdminDashboardViewModel(appSession) as T
            modelClass.isAssignableFrom(CheckInViewModel::class.java) ->
                CheckInViewModel(appSession) as T
            modelClass.isAssignableFrom(AdminUsersViewModel::class.java) ->
                AdminUsersViewModel(appSession) as T
            else -> throw IllegalArgumentException("Unknown ViewModel: ${modelClass.name}")
        }
    }
}
