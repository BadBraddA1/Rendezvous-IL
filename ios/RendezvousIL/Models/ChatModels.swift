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
    let can_moderate: Bool?

    var displayTitle: String {
        if channel_type == "year", let year = event_year {
            return "Rendezvous \(String(year))"
        }
        return name
    }

    var canModerate: Bool { can_moderate == true }
}

struct ChatChannelsResponse: Decodable {
    let channels: [ChatChannelSummary]
}

struct ChatReactionSummary: Codable, Hashable {
    let emoji: String
    let count: Int
    let reacted_by_me: Bool
}

struct ChatMessage: Codable, Identifiable, Hashable {
    let id: String
    let channel_id: String
    let sender_clerk_id: String
    let sender_display_name: String
    let sender_avatar_url: String?
    let body: String
    let image_url: String?
    let image_urls: [String]?
    let kind: String?
    let is_announcement: Bool
    let poll_question: String?
    let poll_options: [String]?
    let poll_counts: [Int]?
    let my_vote: Int?
    let reactions: [ChatReactionSummary]?
    let created_at: String

    var isPoll: Bool { kind == "poll" }

    var photoURLs: [String] {
        if let image_urls, !image_urls.isEmpty { return image_urls }
        if let image_url, !image_url.isEmpty { return [image_url] }
        return []
    }

    var reactionList: [ChatReactionSummary] { reactions ?? [] }
}

struct ChatMessagesResponse: Decodable {
    let messages: [ChatMessage]
    let nextCursor: String?
    let hasMore: Bool
    let can_moderate: Bool?
}

struct ChatMessageResponse: Decodable {
    let message: ChatMessage
}

struct ChatSendMessageBody: Encodable {
    let body: String
    let is_announcement: Bool
}

struct ChatCreatePollBody: Encodable {
    let kind: String
    let body: String
    let poll_question: String
    let poll_options: [String]
}

struct ChatVoteBody: Encodable {
    let option_index: Int
}

struct ChatVoteResponse: Decodable {
    let poll: ChatPollUpdate
}

struct ChatPollUpdate: Decodable {
    let message_id: String
    let channel_id: String
    let poll_counts: [Int]
    let my_vote: Int?
}

struct ChatReactionBody: Encodable {
    let emoji: String
}

struct ChatReactionResponse: Decodable {
    let reaction: ChatReactionUpdate
}

struct ChatReactionUpdate: Decodable {
    let message_id: String
    let channel_id: String
    let reactions: [ChatReactionSummary]
    let actor_clerk_id: String
    let added: Bool?
}

struct ChatMessageDeletedPayload: Decodable {
    let id: String
    let channel_id: String?
}

enum ChatReactionEmoji {
    static let all = ["🦙", "👍", "❤️", "😂", "🙏"]
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
