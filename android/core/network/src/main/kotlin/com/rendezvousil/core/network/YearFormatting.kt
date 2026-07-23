package com.rendezvousil.core.network

/**
 * Event-year display helpers.
 *
 * Prefer these over raw Int interpolation in UI copy so years always show as
 * plain digits (mirrors iOS [YearFormatting] — SwiftUI locale grouping is the
 * main risk; keep Android consistent anyway).
 */
object YearFormatting {
    /** Plain digits only. */
    fun label(year: Int): String = year.toString()

    /** `"Rendezvous 2027"` style titles. */
    fun rendezvousTitle(year: Int): String = "Rendezvous ${label(year)}"
}
