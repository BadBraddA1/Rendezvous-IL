package com.rendezvousil.app.ui.directory

import android.app.Application
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.app.directory.DirectoryDataStore
import com.rendezvousil.core.network.dto.DirectoryFamily
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DirectoryUiState(
    val isSignedIn: Boolean = false,
    val enabledYears: List<Int> = listOf(2026),
    val selectedYear: Int = 2026,
    val families: List<DirectoryFamily> = emptyList(),
    val searchQuery: String = "",
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
)

class DirectoryViewModel(
    private val appSession: AppSession,
    application: Application,
) : ViewModel() {
    private val cache = DirectoryDataStore(application)
    private val _uiState = MutableStateFlow(DirectoryUiState())
    val uiState: StateFlow<DirectoryUiState> = _uiState.asStateFlow()

    val filteredFamilies: List<DirectoryFamily>
        get() {
            val query = _uiState.value.searchQuery.trim().lowercase()
            if (query.isEmpty()) return _uiState.value.families
            return _uiState.value.families.filter { family ->
                val haystack = listOfNotNull(
                    family.family_last_name,
                    family.city_state,
                    family.city,
                    family.state,
                    family.directory_blurb,
                    family.husband_first_name,
                    family.wife_first_name,
                    family.email,
                    family.formatted_address,
                    family.contact_phones.joinToString(" ") { "${it.name} ${it.phone}" },
                    family.member_names.joinToString(" "),
                ).joinToString(" ").lowercase()
                haystack.contains(query)
            }
        }

    init {
        hydrateFromCache()
        viewModelScope.launch {
            appSession.isSignedInFlow.collect { signedIn ->
                _uiState.update { it.copy(isSignedIn = signedIn) }
                if (signedIn) {
                    loadEnabledYears(forceNetwork = false)
                    if (_uiState.value.enabledYears.isNotEmpty()) {
                        loadDirectory(forceNetwork = false)
                    }
                }
            }
        }
        viewModelScope.launch {
            appSession.refreshAuth()
        }
    }

    fun onSearchQueryChange(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun onYearSelected(year: Int) {
        if (year == _uiState.value.selectedYear) return
        _uiState.update { it.copy(selectedYear = year) }
        loadDirectory(forceNetwork = false)
    }

    fun tryAlternateYear() {
        val alternate = _uiState.value.enabledYears.firstOrNull {
            it != _uiState.value.selectedYear
        } ?: return
        onYearSelected(alternate)
    }

    fun refresh() {
        viewModelScope.launch {
            appSession.refreshAuth()
            _uiState.update { it.copy(isSignedIn = appSession.isSignedIn) }
            if (appSession.isSignedIn) {
                loadEnabledYears(forceNetwork = true)
                if (_uiState.value.enabledYears.isNotEmpty()) {
                    loadDirectory(forceNetwork = true)
                }
            }
        }
    }

    private fun hydrateFromCache() {
        val years = cache.loadYears()?.takeIf { it.isNotEmpty() } ?: listOf(2026)
        val selected = if (years.contains(_uiState.value.selectedYear)) {
            _uiState.value.selectedYear
        } else {
            years.first()
        }
        val families = cache.loadFamilies(selected).orEmpty()
        _uiState.update {
            it.copy(
                enabledYears = years,
                selectedYear = selected,
                families = families,
                isLoading = false,
                errorMessage = null,
            )
        }
    }

    private fun loadEnabledYears(forceNetwork: Boolean) {
        viewModelScope.launch {
            if (!forceNetwork) {
                cache.loadYears()?.takeIf { it.isNotEmpty() }?.let { years ->
                    val selected = if (years.contains(_uiState.value.selectedYear)) {
                        _uiState.value.selectedYear
                    } else {
                        years.first()
                    }
                    _uiState.update { it.copy(enabledYears = years, selectedYear = selected) }
                }
            }

            val client = appSession.authenticatedApiClient ?: return@launch
            try {
                val response = client.getDirectoryYears()
                val years = response.years.ifEmpty { listOf(2026) }
                cache.saveYears(years)
                val selectedYear = if (years.contains(_uiState.value.selectedYear)) {
                    _uiState.value.selectedYear
                } else {
                    years.first()
                }
                _uiState.update {
                    it.copy(enabledYears = years, selectedYear = selectedYear)
                }
            } catch (_: Exception) {
                if (_uiState.value.enabledYears.isEmpty()) {
                    _uiState.update {
                        it.copy(enabledYears = listOf(2026), selectedYear = 2026)
                    }
                }
            }
        }
    }

    private fun loadDirectory(forceNetwork: Boolean) {
        viewModelScope.launch {
            val year = _uiState.value.selectedYear
            val cached = cache.loadFamilies(year).orEmpty()
            if (!forceNetwork && cached.isNotEmpty()) {
                _uiState.update {
                    it.copy(
                        families = cached,
                        isLoading = false,
                        errorMessage = null,
                    )
                }
                refreshDirectoryInBackground(showErrorsWhenEmpty = false)
                return@launch
            }

            if (_uiState.value.families.isEmpty()) {
                _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            }
            refreshDirectoryInBackground(showErrorsWhenEmpty = true)
        }
    }

    private suspend fun refreshDirectoryInBackground(showErrorsWhenEmpty: Boolean) {
        val client = appSession.authenticatedApiClient ?: run {
            _uiState.update { it.copy(isLoading = false) }
            return
        }
        val year = _uiState.value.selectedYear
        _uiState.update { it.copy(isRefreshing = true) }
        try {
            val response = client.getDirectory(year)
            cache.saveFamilies(year, response.families)
            _uiState.update {
                it.copy(
                    isLoading = false,
                    isRefreshing = false,
                    families = response.families,
                    errorMessage = null,
                )
            }
        } catch (error: Exception) {
            val keepCached = _uiState.value.families.isNotEmpty() && !showErrorsWhenEmpty
            _uiState.update {
                it.copy(
                    isLoading = false,
                    isRefreshing = false,
                    families = if (keepCached) it.families else emptyList(),
                    errorMessage = if (keepCached) {
                        null
                    } else {
                        error.message ?: "Could not load directory"
                    },
                )
            }
        }
    }
}
