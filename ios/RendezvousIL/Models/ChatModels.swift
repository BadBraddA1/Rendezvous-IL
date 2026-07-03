import Foundation

struct ChatChannelSummary: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let channel_type: String
    let event_year: Int?
    let description: String?
    let is_active: Bool
    let is_test: Bool
    let last_message_preview: String?
    let last_message_at: String?

    var displayTitle: String {
        if channel_type == "year", let year = event_year {
            return "Rendezvous \(String(year))"
        }
        return name
    }
}

struct ChatChannelsResponse: Decodable {
    let channels: [ChatChannelSummary]
}

struct ChatMessage: Codable, Identifiable, Hashable {
    let id: String
    let channel_id: String
    let sender_clerk_id: String
    let sender_display_name: String
    let sender_avatar_url: String?
    let body: String
    let is_announcement: Bool
    let created_at: String
}

struct ChatMessagesResponse: Decodable {
    let messages: [ChatMessage]
    let nextCursor: String?
    let hasMore: Bool
}

struct ChatMessageResponse: Decodable {
    let message: ChatMessage
}

struct ChatSendMessageBody: Encodable {
    let body: String
    let is_announcement: Bool
}

struct AblyTokenResponse: Decodable {
    let tokenRequest: AblyTokenRequestPayload
}

struct AblyTokenRequestPayload: Codable {
    let keyName: String?
    let ttl: Int?
    let capability: String?
    let clientId: String?
    let timestamp: Int64?
    let nonce: String?
    let mac: String?
}
