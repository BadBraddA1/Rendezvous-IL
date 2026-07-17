import Foundation

struct HomeBoardSection: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let type: String
    let enabled: Bool
    let title: String?
    let body: String?
    let linkUrl: String?
    let linkLabel: String?
}

struct HomeBoardConfig: Codable, Sendable {
    let eventYear: Int
    let sections: [HomeBoardSection]
}

struct FamilyCheckInResponse: Codable, Sendable {
    let eventYear: Int
    let hasRegistration: Bool
    let checkedIn: Bool
    let checkedInAt: String?
    let lodgingType: String?
    let roomKeys: [String]
    let familyLastName: String?
    let attendeeCount: Int?
    let message: String?

    var lodgingLabel: String? {
        guard let lodgingType, !lodgingType.isEmpty else { return nil }
        switch lodgingType.lowercased() {
        case "motel": return "Motel"
        case "rv": return "RV"
        case "tent": return "Tent"
        case "drivein": return "Drive-in"
        default: return lodgingType.capitalized
        }
    }
}
