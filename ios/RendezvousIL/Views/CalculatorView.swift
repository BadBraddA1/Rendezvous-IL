import SwiftUI

struct CalculatorView: View {
    @Environment(AppSession.self) private var session
    @Environment(RendezvousRepository.self) private var repository

    @State private var adults = 2
    @State private var youth = 0
    @State private var children = 0
    @State private var lodging: LodgingType = .motel
    @State private var packagePreset: CalcPackagePreset = .full
    @State private var estimate: CalculatorEstimatePayload?
    @State private var estimating = false
    @State private var estimateError: String?

    var body: some View {
        Form {
            Section("Family") {
                Stepper("Adults: \(adults)", value: $adults, in: 1 ... 12)
                Stepper("Youth (12–17): \(youth)", value: $youth, in: 0 ... 12)
                Stepper("Children (6–11): \(children)", value: $children, in: 0 ... 12)
            }

            Section("Lodging") {
                Picker("Type", selection: $lodging) {
                    ForEach(LodgingType.allCases) { type in
                        Text(type.label).tag(type)
                    }
                }
                .pickerStyle(.segmented)
            }

            Section("Package") {
                Picker("Stay", selection: $packagePreset) {
                    ForEach(CalcPackagePreset.allCases) { preset in
                        Text(preset.label).tag(preset)
                    }
                }
                Text(packagePreset.detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Section("Estimated total") {
                if estimating {
                    ProgressView("Calculating…")
                } else if let estimate, let total = estimate.total {
                    if let lodging = estimate.lodging {
                        LabeledContent("Lodging", value: formatMoney(lodging))
                    }
                    if let site = estimate.siteFee, site > 0 {
                        LabeledContent("Site fee", value: formatMoney(site))
                    }
                    if let deductions = estimate.deductions, deductions > 0 {
                        LabeledContent("Meal deductions", value: "−\(formatMoney(deductions))")
                    }
                    if let fee = repository.rates?.registrationFee, fee > 0 {
                        LabeledContent("Registration", value: formatMoney(fee))
                    }
                    LabeledContent(
                        "Total",
                        value: formatMoney(total + (repository.rates?.registrationFee ?? 0))
                    )
                    .font(.headline)
                    .foregroundStyle(BrandColors.lake)

                    if let lines = estimate.members, !lines.isEmpty {
                        ForEach(lines) { line in
                            LabeledContent(
                                line.member.name,
                                value: formatMoney(line.total ?? 0)
                            )
                            .font(.caption)
                        }
                    }
                } else if let estimateError {
                    Text(estimateError)
                        .foregroundStyle(.secondary)
                } else {
                    Text("Pull to refresh for an estimate.")
                        .foregroundStyle(.secondary)
                }
            }

            Section {
                Text("Estimate only. Final pricing may vary. Registration stays on the website.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Cost calculator")
        .task {
            await repository.loadRates()
            await refreshEstimate()
        }
        .onChange(of: adults) { _, _ in Task { await refreshEstimate() } }
        .onChange(of: youth) { _, _ in Task { await refreshEstimate() } }
        .onChange(of: children) { _, _ in Task { await refreshEstimate() } }
        .onChange(of: lodging) { _, _ in Task { await refreshEstimate() } }
        .onChange(of: packagePreset) { _, _ in Task { await refreshEstimate() } }
        .refreshable {
            await repository.loadRates()
            await refreshEstimate()
        }
    }

    private func refreshEstimate() async {
        estimating = true
        estimateError = nil
        defer { estimating = false }

        var members: [CalculatorEstimateMember] = []
        var attendance: [String: CalculatorAttendance] = [:]
        let nights = packagePreset.nights
        let meals = packagePreset.meals

        for i in 0 ..< adults {
            let id = "adult-\(i)"
            members.append(.init(id: id, name: "Adult \(i + 1)", age: 35))
            attendance[id] = .init(attending: true, nights: nights, meals: meals)
        }
        for i in 0 ..< youth {
            let id = "youth-\(i)"
            members.append(.init(id: id, name: "Youth \(i + 1)", age: 14))
            attendance[id] = .init(attending: true, nights: nights, meals: meals)
        }
        for i in 0 ..< children {
            let id = "child-\(i)"
            members.append(.init(id: id, name: "Child \(i + 1)", age: 8))
            attendance[id] = .init(attending: true, nights: nights, meals: meals)
        }

        let body = CalculatorEstimateRequest(
            year: AppConfig.eventYear,
            members: members,
            attendance: attendance,
            lodgingType: lodging.rawValue,
            numNights: nights.count
        )

        // Prefer signed-in client; estimate API is public so shared works too.
        let client = session.apiClient ?? APIClient.shared
        do {
            let response = try await client.postCalculatorEstimate(body)
            estimate = response.estimate
            if response.estimate == nil {
                estimateError = "Could not calculate estimate"
            }
        } catch {
            estimate = nil
            estimateError = error.localizedDescription
        }
    }

    private func formatMoney(_ value: Double) -> String {
        String(format: "$%.2f", value)
    }
}

enum CalcPackagePreset: String, CaseIterable, Identifiable {
    case full, special_3_9, special_2_6, special_1_3

    var id: String { rawValue }

    var label: String {
        switch self {
        case .full: return "Full week"
        case .special_3_9: return "3 / 9"
        case .special_2_6: return "2 / 6"
        case .special_1_3: return "1 / 3"
        }
    }

    var detail: String {
        switch self {
        case .full: return "4 nights · 12 meals"
        case .special_3_9: return "3 nights · 9 meals"
        case .special_2_6: return "2 nights · 6 meals"
        case .special_1_3: return "1 night · 3 meals"
        }
    }

    var nights: [String] {
        switch self {
        case .full: return ["mon", "tue", "wed", "thu"]
        case .special_3_9: return ["mon", "tue", "wed"]
        case .special_2_6: return ["mon", "tue"]
        case .special_1_3: return ["mon"]
        }
    }

    var meals: [String: [String]] {
        switch self {
        case .full:
            return [
                "mon": ["dinner"],
                "tue": ["breakfast", "lunch", "dinner"],
                "wed": ["breakfast", "lunch", "dinner"],
                "thu": ["breakfast", "lunch", "dinner"],
                "fri": ["breakfast", "lunch"],
            ]
        case .special_3_9:
            return [
                "mon": ["dinner"],
                "tue": ["breakfast", "lunch", "dinner"],
                "wed": ["breakfast", "lunch", "dinner"],
                "thu": ["breakfast", "lunch", "dinner"],
            ]
        case .special_2_6:
            return [
                "mon": ["dinner"],
                "tue": ["breakfast", "lunch", "dinner"],
                "wed": ["breakfast", "lunch"],
            ]
        case .special_1_3:
            return [
                "mon": ["dinner"],
                "tue": ["breakfast", "lunch"],
            ]
        }
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
