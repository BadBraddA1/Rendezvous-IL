import Foundation

struct FamilyProfileResponse: Codable, Sendable {
    let family: FamilyProfile?
    let pendingChanges: [FamilyPendingChange]
    let accountRole: String?
    let loginInvites: [FamilyLoginInvite]?

    enum CodingKeys: String, CodingKey {
        case family, pendingChanges, accountRole, loginInvites
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        family = try container.decodeIfPresent(FamilyProfile.self, forKey: .family)
        pendingChanges = (try? container.decode([FamilyPendingChange].self, forKey: .pendingChanges)) ?? []
        accountRole = try container.decodeIfPresent(String.self, forKey: .accountRole)
        loginInvites = try container.decodeIfPresent([FamilyLoginInvite].self, forKey: .loginInvites)
    }
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

    enum CodingKeys: String, CodingKey {
        case id, family_last_name, email, husband_phone, wife_phone
        case address, city, state, zip, home_congregation, members
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try Self.decodeInt(from: container, forKey: .id)
        family_last_name = Self.decodeOptionalString(from: container, forKey: .family_last_name)
        email = Self.decodeOptionalString(from: container, forKey: .email)
        husband_phone = Self.decodeOptionalString(from: container, forKey: .husband_phone)
        wife_phone = Self.decodeOptionalString(from: container, forKey: .wife_phone)
        address = Self.decodeOptionalString(from: container, forKey: .address)
        city = Self.decodeOptionalString(from: container, forKey: .city)
        state = Self.decodeOptionalString(from: container, forKey: .state)
        zip = Self.decodeOptionalString(from: container, forKey: .zip)
        home_congregation = Self.decodeOptionalString(from: container, forKey: .home_congregation)
        members = try container.decodeIfPresent([FamilyProfileMember].self, forKey: .members)
    }

    private static func decodeInt(from container: KeyedDecodingContainer<CodingKeys>, forKey key: CodingKeys) throws -> Int {
        if let value = try? container.decode(Int.self, forKey: key) { return value }
        if let value = try? container.decode(String.self, forKey: key), let int = Int(value) { return int }
        if let value = try? container.decode(Double.self, forKey: key) { return Int(value) }
        throw DecodingError.dataCorruptedError(forKey: key, in: container, debugDescription: "Expected int")
    }

    private static func decodeOptionalString(from container: KeyedDecodingContainer<CodingKeys>, forKey key: CodingKeys) -> String? {
        if let value = try? container.decode(String.self, forKey: key) { return value }
        if let value = try? container.decode(Int.self, forKey: key) { return String(value) }
        if let value = try? container.decode(Double.self, forKey: key) { return String(Int(value)) }
        return nil
    }
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

    enum CodingKeys: String, CodingKey {
        case id, first_name, last_name, member_type, age_group, date_of_birth
        case grade, gender, phone, email, special_needs, notes
    }

    init(
        id: Int?,
        first_name: String,
        last_name: String,
        member_type: String,
        age_group: String?,
        date_of_birth: String?,
        grade: String?,
        gender: String?,
        phone: String?,
        email: String?,
        special_needs: Bool?,
        notes: String?
    ) {
        self.id = id
        self.first_name = first_name
        self.last_name = last_name
        self.member_type = member_type
        self.age_group = age_group
        self.date_of_birth = date_of_birth
        self.grade = grade
        self.gender = gender
        self.phone = phone
        self.email = email
        self.special_needs = special_needs
        self.notes = notes
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        if let intId = try? container.decode(Int.self, forKey: .id) {
            id = intId
        } else if let stringId = try? container.decode(String.self, forKey: .id), let intId = Int(stringId) {
            id = intId
        } else {
            id = nil
        }
        first_name = Self.decodeString(from: container, forKey: .first_name) ?? ""
        last_name = Self.decodeString(from: container, forKey: .last_name) ?? ""
        member_type = Self.decodeString(from: container, forKey: .member_type) ?? "adult"
        age_group = Self.decodeString(from: container, forKey: .age_group)
        date_of_birth = Self.decodeString(from: container, forKey: .date_of_birth)
        grade = Self.decodeString(from: container, forKey: .grade)
        gender = Self.decodeString(from: container, forKey: .gender)
        phone = Self.decodeString(from: container, forKey: .phone)
        email = Self.decodeString(from: container, forKey: .email)
        notes = Self.decodeString(from: container, forKey: .notes)
        special_needs = Self.decodeBool(from: container, forKey: .special_needs)
    }

    private static func decodeString(from container: KeyedDecodingContainer<CodingKeys>, forKey key: CodingKeys) -> String? {
        if let value = try? container.decode(String.self, forKey: key) { return value }
        if let value = try? container.decode(Int.self, forKey: key) { return String(value) }
        if let value = try? container.decode(Double.self, forKey: key) { return String(value) }
        return nil
    }

    private static func decodeBool(from container: KeyedDecodingContainer<CodingKeys>, forKey key: CodingKeys) -> Bool? {
        if let value = try? container.decode(Bool.self, forKey: key) { return value }
        if let value = try? container.decode(Int.self, forKey: key) { return value != 0 }
        if let value = try? container.decode(String.self, forKey: key) {
            return ["1", "true", "yes"].contains(value.lowercased())
        }
        return nil
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
