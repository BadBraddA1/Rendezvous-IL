export function formatMoney(amount: number): string {
  return amount.toFixed(2)
}

/** Lodging/person rates; site_night rows are per site, not per person. */
export function ratePricingHint(rate: { name: string; category: string }): string {
  if (rate.name.includes("site_night") || rate.name.endsWith("_site")) {
    return "per site"
  }
  if (rate.category === "registration") {
    return "per family"
  }
  return "per person"
}

export function calculatorCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    motel: "Motel (per person)",
    rv: "RV lodging (per person)",
    tent: "Tent lodging (per person)",
    drivein: "Drive-in (per person)",
    deduction: "Meal deductions (per person)",
    meal_addition: "Drive-in meals (per person)",
    special_3_9: "3/9 package (per person)",
    special_2_6: "2/6 package (per person)",
    special_1_3: "1/3 package (per person)",
    registration: "Registration fees",
  }
  return labels[category] || category.replace(/_/g, " ")
}

export function formatUnitLine(count: number, unitPrice: number, unitLabel = "per person"): string {
  if (count <= 0) return ""
  return `${count} × $${formatMoney(unitPrice)} ${unitLabel}`
}

export function formatSiteFeeLine(nights: number, nightlyRate: number): string {
  return `$${formatMoney(nightlyRate)}/night × ${nights} night${nights === 1 ? "" : "s"} (per site)`
}
