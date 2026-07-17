package com.rendezvousil.app.ui.directory

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.app.auth.AppSession
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
    val errorMessage: String? = null,
)

class DirectoryViewModel(
    private val appSession: AppSession,
) : ViewModel() {
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
        viewModelScope.launch {
            appSession.isSignedInFlow.collect { signedIn ->
                _uiState.update { it.copy(isSignedIn = signedIn) }
                if (signedIn) {
                    loadEnabledYears()
                    if (_uiState.value.enabledYears.isNotEmpty()) {
                        loadDirectory()
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
        loadDirectory()
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
                loadEnabledYears()
                if (_uiState.value.enabledYears.isNotEmpty()) {
                    loadDirectory()
                }
            }
        }
    }

    private fun loadEnabledYears() {
        viewModelScope.launch {
            val client = appSession.authenticatedApiClient
            if (client == null) {
                _uiState.update {
                    it.copy(enabledYears = listOf(2026), selectedYear = 2026)
                }
                return@launch
            }

            try {
                val response = client.getDirectoryYears()
                val years = response.years.ifEmpty { listOf(2026) }
                val selectedYear = if (years.contains(_uiState.value.selectedYear)) {
                    _uiState.value.selectedYear
                } else {
                    years.first()
                }
                _uiState.update {
                    it.copy(enabledYears = years, selectedYear = selectedYear)
                }
            } catch (_: Exception) {
                _uiState.update {
                    it.copy(enabledYears = listOf(2026), selectedYear = 2026)
                }
            }
        }
    }

    private fun loadDirectory() {
        viewModelScope.launch {
            val client = appSession.authenticatedApiClient ?: return@launch
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val response = client.getDirectory(_uiState.value.selectedYear)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        families = response.families,
                        errorMessage = null,
                    )
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        families = emptyList(),
                        errorMessage = error.message ?: "Could not load directory",
                    )
                }
            }
        }
    }
}
