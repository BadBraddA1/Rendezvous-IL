import SwiftUI

struct CalculatorView: View {
    @Environment(RendezvousRepository.self) private var repository

    @State private var adults = 2
    @State private var youth = 0
    @State private var children = 0
    @State private var lodging: LodgingType = .motel

    private let nights = 4

    var body: some View {
        Form {
            if repository.rates == nil {
                Section {
                    ProgressView("Loading rates…")
                }
            }

            Section("Family") {
                Stepper("Adults: \(adults)", value: $adults, in: 1 ... 12)
                Stepper("Youth (12–17): \(youth)", value: $youth, in: 0 ... 12)
                Stepper("Children (3–11): \(children)", value: $children, in: 0 ... 12)
            }

            Section("Lodging") {
                Picker("Type", selection: $lodging) {
                    ForEach(LodgingType.allCases) { type in
                        Text(type.label).tag(type)
                    }
                }
                .pickerStyle(.segmented)
            }

            Section("Estimated total") {
                if let breakdown = calculation {
                    if adults > 0 {
                        LabeledContent(
                            unitLine(count: adults, unit: breakdown.adultUnit),
                            value: formatMoney(breakdown.adults)
                        )
                    }
                    if youth > 0 {
                        LabeledContent(
                            unitLine(count: youth, unit: breakdown.youthUnit),
                            value: formatMoney(breakdown.youth)
                        )
                    }
                    if children > 0 {
                        LabeledContent(
                            unitLine(count: children, unit: breakdown.childUnit),
                            value: formatMoney(breakdown.children)
                        )
                    }
                    if breakdown.siteFee > 0 {
                        LabeledContent(
                            siteFeeLine(nights: nights, nightlyRate: breakdown.siteNightRate),
                            value: formatMoney(breakdown.siteFee)
                        )
                    }
                    if let fee = repository.rates?.registrationFee, fee > 0 {
                        LabeledContent("Registration", value: formatMoney(fee))
                    }
                    LabeledContent("Total", value: formatMoney(breakdown.total + (repository.rates?.registrationFee ?? 0)))
                        .font(.headline)
                        .foregroundStyle(BrandColors.lake)
                } else {
                    Text("Rates unavailable — check connection and try again.")
                        .foregroundStyle(.secondary)
                }
            }

            Section {
                Text("Estimate only. Final pricing may vary. Registration opens January 1, 2027.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Cost calculator")
        .task {
            await repository.loadRates()
        }
    }

    private var calculation: CostBreakdown? {
        guard let rates = repository.rates?.rates else { return nil }
        return CostCalculator.compute(
            adults: adults,
            youth: youth,
            children: children,
            lodging: lodging,
            nights: nights,
            rates: rates
        )
    }

    private func formatMoney(_ value: Double) -> String {
        String(format: "$%.2f", value)
    }

    private func unitLine(count: Int, unit: Double) -> String {
        "\(count) × \(formatMoney(unit)) per person"
    }

    private func siteFeeLine(nights: Int, nightlyRate: Double) -> String {
        let nightLabel = nights == 1 ? "night" : "nights"
        return "\(formatMoney(nightlyRate))/night × \(nights) \(nightLabel) (per site)"
    }
}

enum LodgingType: String, CaseIterable, Identifiable {
    case motel, rv, tent, drivein

    var id: String { rawValue }

    var label: String {
        switch self {
        case .motel: return "Motel"
        case .rv: return "RV"
        case .tent: return "Tent"
        case .drivein: return "Drive-in"
        }
    }
}

struct CostBreakdown {
    let adults: Double
    let youth: Double
    let children: Double
    let adultUnit: Double
    let youthUnit: Double
    let childUnit: Double
    let siteFee: Double
    let siteNightRate: Double
    let total: Double
}

enum CostCalculator {
    static func compute(
        adults: Int,
        youth: Int,
        children: Int,
        lodging: LodgingType,
        nights: Int,
        rates: [String: [Rate]]
    ) -> CostBreakdown {
        func amount(category: String, nameContains: String) -> Double {
            guard let list = rates[category] else { return 0 }
            guard let rate = list.first(where: { $0.name.contains(nameContains) }) else { return 0 }
            return Double(rate.amount) ?? 0
        }

        let occupancy: String = {
            let paying = adults + youth + children
            switch paying {
            case 0...1: return "single"
            case 2: return "double"
            case 3: return "triple"
            default: return "quad"
            }
        }()

        var adultCost = 0.0
        var youthCost = 0.0
        var childCost = 0.0
        var adultUnit = 0.0
        var youthUnit = 0.0
        var childUnit = 0.0
        var siteFee = 0.0
        var siteNightRate = 0.0

        switch lodging {
        case .motel:
            adultUnit = amount(category: "motel", nameContains: "motel_\(occupancy)_adult")
            youthUnit = amount(category: "motel", nameContains: "motel_youth")
            childUnit = amount(category: "motel", nameContains: "motel_child")
            adultCost = Double(adults) * adultUnit
            youthCost = Double(youth) * youthUnit
            childCost = Double(children) * childUnit
        case .rv:
            adultUnit = amount(category: "rv", nameContains: "rv_adult")
            youthUnit = amount(category: "rv", nameContains: "rv_youth")
            childUnit = amount(category: "rv", nameContains: "rv_child")
            adultCost = Double(adults) * adultUnit
            youthCost = Double(youth) * youthUnit
            childCost = Double(children) * childUnit
        case .tent:
            adultUnit = amount(category: "tent", nameContains: "tent_adult")
            youthUnit = amount(category: "tent", nameContains: "tent_youth")
            childUnit = amount(category: "tent", nameContains: "tent_child")
            adultCost = Double(adults) * adultUnit
            youthCost = Double(youth) * youthUnit
            childCost = Double(children) * childUnit
        case .drivein:
            let days = 5.0
            let adultEntry = amount(category: "drivein", nameContains: "drivein_adult") * days
            let youthEntry = amount(category: "drivein", nameContains: "drivein_youth") * days
            let childEntry = amount(category: "drivein", nameContains: "drivein_child") * days
            adultUnit = adultEntry + driveInMeals(age: "adult", rates: rates)
            youthUnit = youthEntry + driveInMeals(age: "youth", rates: rates)
            childUnit = childEntry + driveInMeals(age: "child", rates: rates)
            adultCost = Double(adults) * adultUnit
            youthCost = Double(youth) * youthUnit
            childCost = Double(children) * childUnit
        }

        if lodging == .rv {
            siteNightRate = amount(category: "rv", nameContains: "rv_site_night")
            siteFee = siteNightRate * Double(nights)
        } else if lodging == .tent {
            siteNightRate = amount(category: "tent", nameContains: "tent_site_night")
            siteFee = siteNightRate * Double(nights)
        }

        return CostBreakdown(
            adults: adultCost,
            youth: youthCost,
            children: childCost,
            adultUnit: adultUnit,
            youthUnit: youthUnit,
            childUnit: childUnit,
            siteFee: siteFee,
            siteNightRate: siteNightRate,
            total: adultCost + youthCost + childCost + siteFee
        )
    }

    private static func driveInMeals(age: String, rates: [String: [Rate]]) -> Double {
        guard let list = rates["meal_addition"] else { return 0 }
        func a(_ name: String) -> Double {
            Double(list.first(where: { $0.name.contains(name) })?.amount ?? "0") ?? 0
        }
        return a("breakfast_\(age)") * 4 + a("lunch_\(age)") * 5 + a("dinner_\(age)") * 4
    }
}

#Preview {
    NavigationStack { CalculatorView() }
        .environment(RendezvousRepository())
}
