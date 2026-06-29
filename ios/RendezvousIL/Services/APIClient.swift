import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case unauthorized
    case badStatus(Int)
    case decoding(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .unauthorized:
            return "Sign in required"
        case .badStatus(let code):
            return "Server returned \(code)"
        case .decoding(let error):
            return "Could not read response: \(error.localizedDescription)"
        }
    }
}

actor APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let tokenProvider: (@Sendable () async throws -> String)?

    init(
        session: URLSession = .shared,
        tokenProvider: (@Sendable () async throws -> String)? = nil
    ) {
        self.session = session
        self.decoder = JSONDecoder()
        self.tokenProvider = tokenProvider
    }

    func get<T: Decodable>(_ path: String, as type: T.Type = T.self) async throws -> T {
        try await request(path, method: "GET", body: nil, as: type)
    }

    func post<T: Decodable, Body: Encodable>(
        _ path: String,
        body: Body,
        as type: T.Type = T.self
    ) async throws -> T {
        let data = try JSONEncoder().encode(body)
        return try await request(path, method: "POST", body: data, as: type)
    }

    func delete<T: Decodable>(_ path: String, as type: T.Type = T.self) async throws -> T {
        try await request(path, method: "DELETE", body: nil, as: type)
    }

    func getAdminMe() async throws -> AdminMeResponse {
        try await get("/api/admin/me")
    }

    func lookupCheckIn(code: String) async throws -> CheckInLookupResponse {
        let encoded = code.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? code
        return try await get("/api/admin/registrations/qr/\(encoded)")
    }

    func searchCheckIn(query: String) async throws -> [CheckInRegistrationSummary] {
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        return try await get("/api/admin/registrations?search=\(encoded)")
    }

    func loadCheckInDetails(id: Int) async throws -> CheckInLookupResponse {
        let payload: CheckInFullResponse = try await get("/api/admin/registrations/\(id)/full")
        return CheckInLookupResponse(
            registration: payload.registration,
            family_members: payload.family_members,
            tshirt_orders: payload.tshirt_orders
        )
    }

    func submitCheckIn(id: Int, roomKeys: [String], tshirtsDistributed: Bool) async throws -> CheckInMutationResponse {
        try await post(
            "/api/admin/registrations/\(id)/checkin",
            body: CheckInSubmitBody(room_keys: roomKeys, tshirts_distributed: tshirtsDistributed)
        )
    }

    func undoCheckIn(id: Int) async throws -> CheckInUndoResponse {
        try await delete("/api/admin/registrations/\(id)/checkin")
    }

    private func request<T: Decodable>(
        _ path: String,
        method: String,
        body: Data?,
        as type: T.Type
    ) async throws -> T {
        let url = AppConfig.url(for: path)
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("RendezvousIL-iOS/1.0", forHTTPHeaderField: "User-Agent")

        if let tokenProvider {
            let token = try await tokenProvider()
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        request.httpBody = body

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.badStatus(-1)
        }
        if http.statusCode == 401 {
            throw APIError.unauthorized
        }
        guard (200 ... 299).contains(http.statusCode) else {
            throw APIError.badStatus(http.statusCode)
        }
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }
}

struct AdminMeResponse: Decodable {
    let authenticated: Bool
    let admin: AdminUserPayload?
    let permissions: AdminPermissionsPayload?
}

struct AdminUserPayload: Decodable {
    let id: String
    let email: String
    let fullName: String
    let role: String
}

struct AdminPermissionsPayload: Decodable {
    let canViewDashboard: Bool
    let canViewRegistrations: Bool
    let canCheckIn: Bool
    let canEdit: Bool
    let canManageUsers: Bool
}

struct CheckInRegistrationSummary: Decodable, Identifiable {
    let id: Int
    let family_last_name: String
    let email: String?
    let lodging_type: String?
    let checked_in: Bool?
}

struct CheckInRegistration: Decodable {
    let id: Int
    let family_last_name: String
    let email: String?
    let husband_phone: String?
    let wife_phone: String?
    let lodging_type: String?
    let checkin_qr_code: String?
    let checked_in: Bool?
    let checked_in_at: String?
    let pre_assigned_keys: [String]?
    let tshirts_distributed: Bool?
    let full_payment_paid: Bool?
    let registration_fee_paid: Bool?
}

struct CheckInFamilyMember: Decodable, Identifiable {
    let id: Int
    let first_name: String
    let last_name: String?
    let age: Int?
}

struct CheckInTshirtOrder: Decodable, Identifiable {
    let id: Int
    let size: String?
    let color: String?
    let quantity: Int?
}

struct CheckInLookupResponse: Decodable {
    let registration: CheckInRegistration
    let family_members: [CheckInFamilyMember]?
    let tshirt_orders: [CheckInTshirtOrder]?
}

struct CheckInFullResponse: Decodable {
    let registration: CheckInRegistration
    let family_members: [CheckInFamilyMember]?
    let tshirt_orders: [CheckInTshirtOrder]?
}

struct CheckInSubmitBody: Encodable {
    let room_keys: [String]
    let tshirts_distributed: Bool
}

struct CheckInMutationResponse: Decodable {
    let success: Bool?
    let registration: CheckInRegistration?
}

struct CheckInUndoResponse: Decodable {
    let success: Bool?
}

struct MealsResponse: Decodable {
    let meals: [Meal]?
}

struct AnnouncementsResponse: Decodable {
    let announcements: [Announcement]?
}

struct VolunteerWeekResponse: Decodable {
    let schedules: [String: VolunteerScheduleSlot]?
}

struct ScheduleAnnouncementsResponse: Decodable {
    let announcements: [Announcement]?
}
