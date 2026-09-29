import Foundation

struct FamilyProfileResponse: Codable, Sendable {
    let family: FamilyProfile?
    let pendingChanges: [FamilyPendingChange]
    let accountRole: String?
    let loginInvites: [FamilyLoginInvite]?
}

struct FamilyProfile: Codable, Identifiable, Sendable {
    let id: Int
    var family_last_name: String?
    var email: String?
    var husband_phone: String?
    var wife_phone: String?
    var address: String?
    var city: String?
    var state: String?
    var zip: String?
    var home_congregation: String?
    var members: [FamilyProfileMember]?
}

struct FamilyProfileMember: Codable, Identifiable, Hashable, Sendable {
    var id: Int?
    var first_name: String
    var last_name: String
    var member_type: String
    var age_group: String?
    var date_of_birth: String?
    var grade: String?
    var gender: String?
    var phone: String?
    var email: String?
    var special_needs: Bool?
    var notes: String?

    var displayName: String {
        "\(first_name) \(last_name)".trimmingCharacters(in: .whitespaces)
    }
}

struct FamilyLoginInvite: Codable, Identifiable, Hashable, Sendable {
    let email: String
    let label: String?
    let linked: Bool
    let clerk_user_id: String?

    var id: String { email }
}

struct FamilyPendingChange: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let change_type: String?
    let field_name: String?
    let old_value: String?
    let new_value: String?
    let status: String?
    let submitted_at: String?

    var summary: String {
        let type = change_type ?? "change"
        switch type {
        case "update_field":
            return "\(field_name ?? "Field") → \(new_value ?? "")"
        case "add_member":
            return "Add family member"
        case "update_member":
            return "Update family member"
        case "remove_member":
            return "Remove family member"
        default:
            return type.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }
}

struct FamilyProfileUpdateBody: Encodable, Sendable {
    var email: String?
    var husband_phone: String?
    var wife_phone: String?
    var family_last_name: String?
    var address: String?
    var city: String?
    var state: String?
    var zip: String?
    var home_congregation: String?
}

struct FamilyMemberMutationResponse: Codable, Sendable {
    let success: Bool?
    let message: String?
    let pending: Bool?
    let directApplied: [String]?
}

struct FamilyProfileUpdateResponse: Codable, Sendable {
    let success: Bool?
    let message: String?
    let changesCount: Int?
    let pendingCount: Int?
    let directApplied: [String]?
}

struct FamilyMemberDeleteBody: Encodable, Sendable {
    let memberId: Int
}

struct AppFeedbackBody: Encodable, Sendable {
    let rating: Int
    let message: String
    let category: String
    let platform: String
    let appVersion: String
}

struct AppFeedbackResponse: Codable, Sendable {
    let success: Bool?
    let message: String?
}

struct CalculatorEstimateRequest: Encodable, Sendable {
    let year: Int
    let members: [CalculatorEstimateMember]
    let attendance: [String: CalculatorAttendance]
    let lodgingType: String
    let numNights: Int
}

struct CalculatorEstimateMember: Encodable, Sendable {
    let id: String
    let name: String
    let age: Int
}

struct CalculatorAttendance: Encodable, Sendable {
    let attending: Bool
    let nights: [String]
    let meals: [String: [String]]
}

struct CalculatorEstimateResponse: Codable, Sendable {
    let year: Int?
    let estimate: CalculatorEstimatePayload?
}

struct CalculatorEstimatePayload: Codable, Sendable {
    let total: Double?
    let lodging: Double?
    let siteFee: Double?
    let deductions: Double?
    let additions: Double?
    let members: [CalculatorEstimateLine]?
}

struct CalculatorEstimateLine: Codable, Identifiable, Sendable {
    var id: String { member.id }
    let member: CalculatorEstimateLineMember
    let total: Double?
    let packageLabel: String?
    let scheduleLabel: String?
}

struct CalculatorEstimateLineMember: Codable, Sendable {
    let id: String
    let name: String
    let age: Int?
}

struct MapAttendeesResponse: Codable, Sendable {
    let year: Int
    let attendees: [MapAttendee]
    let viewerFamilyId: Int?
}

struct MapAttendee: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let familyId: Int?
    let lastName: String?
    let homeCongregation: String?
    let lat: Double?
    let lng: Double?
    let fullAddress: String?
}
