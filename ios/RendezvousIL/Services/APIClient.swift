import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case unauthorized
    case timeout
    case badStatus(Int)
    case serverMessage(String, Int)
    case decoding(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .unauthorized:
            return "Sign in required"
        case .timeout:
            return "Request timed out. Pull to refresh."
        case .badStatus(let code):
            return code == -1 ? "Request timed out. Pull to refresh." : "Server returned \(code)"
        case .serverMessage(let message, _):
            return message
        case .decoding(let error):
            return "Could not read response: \(error.localizedDescription)"
        }
    }

    static func isCancellation(_ error: Error) -> Bool {
        if error is CancellationError { return true }
        if let urlError = error as? URLError, urlError.code == .cancelled { return true }
        let ns = error as NSError
        return ns.domain == NSURLErrorDomain && ns.code == NSURLErrorCancelled
    }
}

actor APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let tokenProvider: (@Sendable () async throws -> String)?
    private let chatDemoCode: String?

    init(
        session: URLSession = .shared,
        tokenProvider: (@Sendable () async throws -> String)? = nil,
        chatDemoCode: String? = nil
    ) {
        self.session = session
        self.decoder = JSONDecoder()
        self.tokenProvider = tokenProvider
        self.chatDemoCode = chatDemoCode
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

    func fetchMobileStatus() async throws -> MobileStatusResponse {
        try await get("/api/me/mobile")
    }

    func recordUserActivity() async throws -> UserActivityResponse {
        struct Body: Encodable {
            let platform: String
            let appVersion: String
        }
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let body = Body(platform: "ios", appVersion: version)
        return try await post("/api/auth/activity", body: body, as: UserActivityResponse.self)
    }

    func getAdminUsers() async throws -> AdminUsersListResponse {
        try await get("/api/admin/users")
    }

    func createAdminUser(
        email: String,
        firstName: String,
        lastName: String,
        role: String?,
        password: String?
    ) async throws -> AdminUserMutationResponse {
        try await post(
            "/api/admin/users",
            body: AdminUserCreateBody(
                email: email,
                firstName: firstName.isEmpty ? nil : firstName,
                lastName: lastName.isEmpty ? nil : lastName,
                role: role,
                password: password
            )
        )
    }

    func updateAdminUserRole(_ body: AdminUserRolePatchBody) async throws -> AdminUserMutationResponse {
        try await patch("/api/admin/users", body: body)
    }

    func updateAdminUserBan(_ body: AdminUserBanPatchBody) async throws -> AdminUserMutationResponse {
        try await patch("/api/admin/users", body: body)
    }

    func deleteAdminUser(id: String) async throws -> SimpleSuccessResponse {
        try await delete("/api/admin/users/\(id)")
    }

    func resetAdminUserPassword(
        userId: String,
        mode: String,
        password: String?
    ) async throws -> AdminResetPasswordResponse {
        try await post(
            "/api/admin/users/\(userId)/reset-password",
            body: AdminResetPasswordBody(mode: mode, password: password)
        )
    }

    func getAdminDashboard() async throws -> AdminDashboardResponse {
        try await get("/api/admin/mobile/dashboard")
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

    func getDirectory(year: Int) async throws -> DirectoryResponse {
        try await get("/api/directory?year=\(year)")
    }

    func getDirectoryYears() async throws -> DirectoryYearsResponse {
        try await get("/api/directory/years")
    }

    func getFamilyDirectorySettings() async throws -> FamilyDirectorySettings {
        let response: FamilyDirectorySettingsEnvelope = try await get("/api/family/directory")
        return response.settings
    }

    func updateFamilyDirectorySettings(
        directoryOptIn: Bool,
        directoryBlurb: String?
    ) async throws -> FamilyDirectorySettingsResponse {
        try await patch(
            "/api/family/directory",
            body: FamilyDirectorySettingsBody(
                directory_opt_in: directoryOptIn,
                directory_blurb: directoryBlurb
            )
        )
    }

    func uploadFamilyDirectoryPhoto(imageData: Data, filename: String, mimeType: String) async throws -> FamilyDirectorySettingsResponse {
        try await uploadMultipart(
            "/api/family/directory",
            fieldName: "photo",
            fileData: imageData,
            filename: filename,
            mimeType: mimeType
        )
    }

    func deleteFamilyDirectoryPhoto() async throws -> FamilyDirectorySettingsResponse {
        try await delete("/api/family/directory")
    }

    func getChatChannels() async throws -> ChatChannelsResponse {
        try await get("/api/chat/channels")
    }

    func getChatMessages(channelId: String, limit: Int = 80) async throws -> ChatMessagesResponse {
        try await get("/api/chat/channels/\(channelId)/messages?limit=\(limit)")
    }

    func sendChatMessage(
        channelId: String,
        body: String,
        isAnnouncement: Bool = false,
        imageDataList: [Data] = []
    ) async throws -> ChatMessageResponse {
        if !imageDataList.isEmpty {
            return try await uploadChatMessage(
                channelId: channelId,
                body: body,
                isAnnouncement: isAnnouncement,
                imageDataList: imageDataList
            )
        }
        return try await post(
            "/api/chat/channels/\(channelId)/messages",
            body: ChatSendMessageBody(body: body, is_announcement: isAnnouncement)
        )
    }

    func createChatPoll(
        channelId: String,
        question: String,
        options: [String]
    ) async throws -> ChatMessageResponse {
        try await post(
            "/api/chat/channels/\(channelId)/messages",
            body: ChatCreatePollBody(
                kind: "poll",
                body: question,
                poll_question: question,
                poll_options: options
            )
        )
    }

    func voteOnChatPoll(messageId: String, optionIndex: Int) async throws -> ChatVoteResponse {
        try await post(
            "/api/chat/messages/\(messageId)/vote",
            body: ChatVoteBody(option_index: optionIndex)
        )
    }

    func toggleChatReaction(messageId: String, emoji: String) async throws -> ChatReactionResponse {
        try await post(
            "/api/chat/messages/\(messageId)/reactions",
            body: ChatReactionBody(emoji: emoji)
        )
    }

    private func uploadChatMessage(
        channelId: String,
        body: String,
        isAnnouncement: Bool,
        imageDataList: [Data]
    ) async throws -> ChatMessageResponse {
        let boundary = "Boundary-\(UUID().uuidString)"
        var data = Data()
        func appendField(name: String, value: String) {
            data.append("--\(boundary)\r\n".data(using: .utf8)!)
            data.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
            data.append("\(value)\r\n".data(using: .utf8)!)
        }
        appendField(name: "body", value: body)
        appendField(name: "is_announcement", value: isAnnouncement ? "true" : "false")
        for (index, imageData) in imageDataList.enumerated() {
            data.append("--\(boundary)\r\n".data(using: .utf8)!)
            data.append("Content-Disposition: form-data; name=\"photo\"; filename=\"chat-photo-\(index).jpg\"\r\n".data(using: .utf8)!)
            data.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            data.append(imageData)
            data.append("\r\n".data(using: .utf8)!)
        }
        data.append("--\(boundary)--\r\n".data(using: .utf8)!)

        let url = AppConfig.url(for: "/api/chat/channels/\(channelId)/messages")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.setValue("RendezvousIL-iOS/1.0", forHTTPHeaderField: "User-Agent")
        if let chatDemoCode {
            request.setValue(chatDemoCode, forHTTPHeaderField: "X-Chat-Demo-Code")
        }
        if let tokenProvider {
            let token = try await tokenProvider()
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = data

        let (responseData, response) = try await session.data(for: request)
        try Self.throwIfFailed(response: response, data: responseData)
        return try decoder.decode(ChatMessageResponse.self, from: responseData)
    }

    func deleteChatMessage(messageId: String) async throws {
        struct Ok: Decodable { let success: Bool? }
        let _: Ok = try await delete("/api/chat/messages/\(messageId)")
    }

    func getAblyToken() async throws -> AblyTokenResponse {
        try await post("/api/ably/token", body: EmptyBody())
    }

    func patch<T: Decodable, Body: Encodable>(
        _ path: String,
        body: Body,
        as type: T.Type = T.self
    ) async throws -> T {
        let data = try JSONEncoder().encode(body)
        return try await request(path, method: "PATCH", body: data, as: type)
    }

    private func uploadMultipart<T: Decodable>(
        _ path: String,
        fieldName: String,
        fileData: Data,
        filename: String,
        mimeType: String
    ) async throws -> T {
        let boundary = "Boundary-\(UUID().uuidString)"
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"\(fieldName)\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        let url = AppConfig.url(for: path)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.setValue("RendezvousIL-iOS/1.0", forHTTPHeaderField: "User-Agent")
        if let chatDemoCode {
            request.setValue(chatDemoCode, forHTTPHeaderField: "X-Chat-Demo-Code")
        }
        if let tokenProvider {
            let token = try await tokenProvider()
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = body

        let (data, response) = try await session.data(for: request)
        try Self.throwIfFailed(response: response, data: data)
        return try decoder.decode(T.self, from: data)
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

        if let chatDemoCode {
            request.setValue(chatDemoCode, forHTTPHeaderField: "X-Chat-Demo-Code")
        }
        if let tokenProvider {
            let token = try await tokenProvider()
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        request.httpBody = body

        let (data, response) = try await session.data(for: request)
        try Self.throwIfFailed(response: response, data: data)
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }

    private static func throwIfFailed(response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else {
            throw APIError.badStatus(-1)
        }
        if http.statusCode == 401 {
            throw APIError.unauthorized
        }
        guard (200 ... 299).contains(http.statusCode) else {
            if let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let message = payload["error"] as? String,
               !message.isEmpty {
                throw APIError.serverMessage(message, http.statusCode)
            }
            throw APIError.badStatus(http.statusCode)
        }
    }
}

struct AdminMeResponse: Decodable {
    let authenticated: Bool
    let admin: AdminUserPayload?
    let permissions: AdminPermissionsPayload?
}

struct MobileStatusResponse: Decodable {
    let authenticated: Bool
    let hasBearer: Bool?
    let email: String?
    let isAdmin: Bool?
    let attendedYears: [Int]?
    let channelCount: Int?
    let directoryYears: [Int]?
    let directoryAccess: [String: Bool]?
    let hasFamilyProfile: Bool?
    let error: String?
}

struct UserActivityResponse: Decodable {
    let success: Bool
    let platform: String?
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

struct AdminDashboardSummaryPayload: Decodable {
    let eventYear: Int
    let registrationGoal: Int
    let registrations: Int
    let registeredAttendees: Int
    let checkedIn: Int
    let totalFamilies: Int
    let totalMembers: Int
    let expressRegistrations: Int
    let pendingChanges: Int
    let activeAnnouncements: Int
    let feedbackCount: Int
    let avgRating: Double
    let returningFamilies: Int
    let newFamilies: Int
    let totalRevenue: Double
    let depositsPaid: Double
    let fullyPaid: Int
    let balanceDue: Double
    let lodgingBreakdown: AdminLodgingBreakdownPayload
}

struct AdminLodgingBreakdownPayload: Decodable {
    let motel: Int
    let rv: Int
    let tent: Int
    let drivein: Int
}

struct AdminDashboardResponse: Decodable {
    let admin: AdminUserPayload
    let summary: AdminDashboardSummaryPayload
    let registrationProgress: Double
    let updatedAt: String
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

struct DirectoryContactPhone: Codable, Hashable, Sendable {
    let member_id: Int?
    let name: String
    let phone: String
}

struct DirectoryFamily: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let family_last_name: String
    let home_congregation: String?
    let city: String?
    let state: String?
    /// Prefers "City, ST" for directory cards.
    let city_state: String?
    let photo_url: String?
    let directory_blurb: String?
    let husband_first_name: String?
    let wife_first_name: String?
    let email: String?
    let formatted_address: String?
    let contact_phones: [DirectoryContactPhone]
    let member_count: Int
    let member_names: [String]

    /// Location line for cards: city/state when available.
    var displayLocation: String? {
        if let city_state, !city_state.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return city_state
        }
        let cityPart = city?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let statePart = state?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !cityPart.isEmpty, !statePart.isEmpty { return "\(cityPart), \(statePart)" }
        if !cityPart.isEmpty { return cityPart }
        if !statePart.isEmpty { return statePart }
        return nil
    }
}

struct DirectoryResponse: Codable, Sendable {
    let year: Int
    let hasAccess: Bool?
    let families: [DirectoryFamily]
}

struct DirectoryYearsResponse: Decodable {
    let years: [Int]
}

struct FamilyDirectorySettings: Decodable {
    let photo_url: String?
    let directory_opt_in: Bool
    let directory_blurb: String?
    let photo_updated_at: String?

    init(
        photo_url: String? = nil,
        directory_opt_in: Bool = true,
        directory_blurb: String? = nil,
        photo_updated_at: String? = nil
    ) {
        self.photo_url = photo_url
        self.directory_opt_in = directory_opt_in
        self.directory_blurb = directory_blurb
        self.photo_updated_at = photo_updated_at
    }
}

struct FamilyDirectorySettingsEnvelope: Decodable {
    let settings: FamilyDirectorySettings
}

struct FamilyDirectorySettingsResponse: Decodable {
    let success: Bool?
    let settings: FamilyDirectorySettings
}

struct FamilyDirectorySettingsBody: Encodable {
    let directory_opt_in: Bool
    let directory_blurb: String?
}

private struct EmptyBody: Encodable {}
