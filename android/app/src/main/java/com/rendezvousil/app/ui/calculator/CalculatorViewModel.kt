package com.rendezvousil.app.ui.calculator

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.core.network.RendezvousRepository
import com.rendezvousil.core.network.dto.RatesPayload
import com.rendezvousil.core.schedule.CostCalculator
import com.rendezvousil.core.schedule.model.CostBreakdown
import com.rendezvousil.core.schedule.model.LodgingType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class CalculatorViewModel(
    private val repository: RendezvousRepository,
) : ViewModel() {
    val rates: StateFlow<RatesPayload?> = repository.rates

    private val _adults = MutableStateFlow(2)
    val adults: StateFlow<Int> = _adults.asStateFlow()

    private val _youth = MutableStateFlow(0)
    val youth: StateFlow<Int> = _youth.asStateFlow()

    private val _children = MutableStateFlow(0)
    val children: StateFlow<Int> = _children.asStateFlow()

    private val _lodging = MutableStateFlow(LodgingType.MOTEL)
    val lodging: StateFlow<LodgingType> = _lodging.asStateFlow()

    val nights: Int = 4

    init {
        viewModelScope.launch { repository.loadRates() }
    }

    fun setAdults(value: Int) {
        _adults.value = value.coerceIn(1, 12)
    }

    fun setYouth(value: Int) {
        _youth.value = value.coerceIn(0, 12)
    }

    fun setChildren(value: Int) {
        _children.value = value.coerceIn(0, 12)
    }

    fun setLodging(value: LodgingType) {
        _lodging.value = value
    }

    fun calculation(): CostBreakdown? {
        val rateMap = repository.rates.value?.rates ?: return null
        return CostCalculator.compute(
            adults = _adults.value,
            youth = _youth.value,
            children = _children.value,
            lodging = _lodging.value,
            nights = nights,
            rates = rateMap,
        )
    }

    fun registrationFee(): Double = repository.rates.value?.registrationFee ?: 0.0
}
