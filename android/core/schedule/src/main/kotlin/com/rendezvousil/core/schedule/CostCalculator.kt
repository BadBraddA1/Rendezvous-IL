package com.rendezvousil.core.schedule

import com.rendezvousil.core.schedule.model.CostBreakdown
import com.rendezvousil.core.schedule.model.LodgingType
import com.rendezvousil.core.schedule.model.Rate

object CostCalculator {
    fun compute(
        adults: Int,
        youth: Int,
        children: Int,
        lodging: LodgingType,
        nights: Int,
        rates: Map<String, List<Rate>>,
    ): CostBreakdown {
        fun amount(category: String, nameContains: String): Double {
            val list = rates[category] ?: return 0.0
            val rate = list.firstOrNull { it.name.contains(nameContains) } ?: return 0.0
            return rate.amount.toDoubleOrNull() ?: 0.0
        }

        val occupancy = when (adults + youth + children) {
            in 0..1 -> "single"
            2 -> "double"
            3 -> "triple"
            else -> "quad"
        }

        var adultCost = 0.0
        var youthCost = 0.0
        var childCost = 0.0
        var adultUnit = 0.0
        var youthUnit = 0.0
        var childUnit = 0.0
        var siteFee = 0.0
        var siteNightRate = 0.0

        when (lodging) {
            LodgingType.MOTEL -> {
                adultUnit = amount("motel", "motel_${occupancy}_adult")
                youthUnit = amount("motel", "motel_youth")
                childUnit = amount("motel", "motel_child")
                adultCost = adults * adultUnit
                youthCost = youth * youthUnit
                childCost = children * childUnit
            }

            LodgingType.RV -> {
                adultUnit = amount("rv", "rv_adult")
                youthUnit = amount("rv", "rv_youth")
                childUnit = amount("rv", "rv_child")
                adultCost = adults * adultUnit
                youthCost = youth * youthUnit
                childCost = children * childUnit
            }

            LodgingType.TENT -> {
                adultUnit = amount("tent", "tent_adult")
                youthUnit = amount("tent", "tent_youth")
                childUnit = amount("tent", "tent_child")
                adultCost = adults * adultUnit
                youthCost = youth * youthUnit
                childCost = children * childUnit
            }

            LodgingType.DRIVEIN -> {
                val days = 5.0
                val adultEntry = amount("drivein", "drivein_adult") * days
                val youthEntry = amount("drivein", "drivein_youth") * days
                val childEntry = amount("drivein", "drivein_child") * days
                adultUnit = adultEntry + driveInMeals("adult", rates)
                youthUnit = youthEntry + driveInMeals("youth", rates)
                childUnit = childEntry + driveInMeals("child", rates)
                adultCost = adults * adultUnit
                youthCost = youth * youthUnit
                childCost = children * childUnit
            }
        }

        when (lodging) {
            LodgingType.RV -> {
                siteNightRate = amount("rv", "rv_site_night")
                siteFee = siteNightRate * nights
            }

            LodgingType.TENT -> {
                siteNightRate = amount("tent", "tent_site_night")
                siteFee = siteNightRate * nights
            }

            else -> Unit
        }

        return CostBreakdown(
            adults = adultCost,
            youth = youthCost,
            children = childCost,
            adultUnit = adultUnit,
            youthUnit = youthUnit,
            childUnit = childUnit,
            siteFee = siteFee,
            siteNightRate = siteNightRate,
            total = adultCost + youthCost + childCost + siteFee,
        )
    }

    private fun driveInMeals(age: String, rates: Map<String, List<Rate>>): Double {
        val list = rates["meal_addition"] ?: return 0.0
        fun a(name: String): Double {
            val amount = list.firstOrNull { it.name.contains(name) }?.amount ?: "0"
            return amount.toDoubleOrNull() ?: 0.0
        }
        return a("breakfast_$age") * 4 + a("lunch_$age") * 5 + a("dinner_$age") * 4
    }
}
