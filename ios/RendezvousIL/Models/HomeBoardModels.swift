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

// MARK: - Year hub (season Home)

struct YearHubMember: Codable, Sendable, Identifiable {
    let id: Int
    let firstName: String
    let lastName: String
}

struct YearHubFamily: Codable, Sendable {
    let id: Int
    let lastName: String
    let email: String?
    let city: String?
    let state: String?
    let homeCongregation: String?
    let members: [YearHubMember]
}

struct YearHubRegistration: Codable, Sendable {
    let id: Int
    let familyLastName: String
    let lodgingType: String?
    let attendeeCount: Int?
    let checkedIn: Bool
    let totalCost: Double?
    let paymentStatus: String?
}

struct YearHubVolunteerRow: Codable, Sendable, Identifiable {
    let id: Int
    let volunteerName: String
    let volunteerType: String
    let roleLabel: String?
}

struct YearHubVolunteering: Codable, Sendable {
    let hasContent: Bool
    let volunteers: [YearHubVolunteerRow]
    let specialAssignmentCount: Int
    let nextUp: YearHubNextUp?
}

struct YearHubNextUp: Codable, Sendable {
    let kind: String
    let personName: String
    let eventLabel: String
    let whenLabel: String
    let startsAt: String?
}

struct YearHubLinks: Codable, Sendable {
    let profile: String
    let account: String
    let chat: String
    let registration: String
    let about: String
    let schedule: String
}

struct YearHubResponse: Codable, Sendable {
    let eventYear: Int
    let hasFamily: Bool
    let hasRegistration: Bool
    let registrationOpen: Bool
    let isRetreatWeek: Bool
    let preferSeasonHub: Bool
    let message: String?
    let registerUrl: String
    let family: YearHubFamily?
    let registration: YearHubRegistration?
    let volunteering: YearHubVolunteering?
    let links: YearHubLinks
}
