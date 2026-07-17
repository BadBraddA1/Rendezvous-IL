import Foundation

/// Launch with `-AppStoreScreenshots` (and optional `-ScreenshotTab <name>`) to capture marketing frames.
/// Simulator scripts can also set UserDefaults keys `AppStoreScreenshots` / `ScreenshotTab`
/// (more reliable than launch args with `simctl`).
/// Not used in normal App Store builds unless those args/defaults are set.
enum AppStoreScreenshotMode {
    private static let enabledKey = "AppStoreScreenshots"
    private static let tabKey = "ScreenshotTab"

    static var isEnabled: Bool {
        if ProcessInfo.processInfo.arguments.contains("-AppStoreScreenshots") { return true }
        return UserDefaults.standard.bool(forKey: enabledKey)
    }

    /// welcome | home | schedule | chat | directory | more
    static var tabName: String {
        let args = ProcessInfo.processInfo.arguments
        if let index = args.firstIndex(of: "-ScreenshotTab"),
           args.index(after: index) < args.endIndex {
            return args[args.index(after: index)].lowercased()
        }
        if let tab = UserDefaults.standard.string(forKey: tabKey), !tab.isEmpty {
            return tab.lowercased()
        }
        return "schedule"
    }

    static var showsWelcome: Bool { tabName == "welcome" }

    static var initialTab: AppTab {
        switch tabName {
        case "home": return .home
        case "chat": return .chat
        case "directory": return .directory
        case "more": return .more
        default: return .schedule
        }
    }

    static let sampleChannels: [ChatChannelSummary] = [
        ChatChannelSummary(
            id: "year-2027",
            name: "Rendezvous 2027",
            channel_type: "year",
            event_year: 2027,
            description: nil,
            is_active: true,
            is_test: false,
            last_message_preview: "Looking forward to seeing everyone at the lake!",
            last_message_at: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-3600)),
            unread_count: 3,
            can_moderate: false
        ),
        ChatChannelSummary(
            id: "year-2026",
            name: "Rendezvous 2026",
            channel_type: "year",
            event_year: 2026,
            description: nil,
            is_active: true,
            is_test: false,
            last_message_preview: "Thanks for another great week.",
            last_message_at: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-86_400)),
            unread_count: 0,
            can_moderate: false
        ),
    ]

    static func sampleMessages(for channelId: String) -> [ChatMessage] {
        let iso = ISO8601DateFormatter()
        let base = Date()
        return [
            ChatMessage(
                id: "shot-\(channelId)-1",
                channel_id: channelId,
                sender_clerk_id: "demo-organizer",
                sender_display_name: "Rendezvous Team",
                sender_avatar_url: nil,
                body: "Welcome to year chat — share ride ideas and encouragement here.",
                image_url: nil,
                image_urls: nil,
                kind: "text",
                is_announcement: true,
                poll_question: nil,
                poll_options: nil,
                poll_counts: nil,
                my_vote: nil,
                reactions: [],
                created_at: iso.string(from: base.addingTimeInterval(-7200))
            ),
            ChatMessage(
                id: "shot-\(channelId)-2",
                channel_id: channelId,
                sender_clerk_id: "demo-family",
                sender_display_name: "James Bennett",
                sender_avatar_url: nil,
                body: "Looking forward to seeing everyone at the lake!",
                image_url: nil,
                image_urls: nil,
                kind: "text",
                is_announcement: false,
                poll_question: nil,
                poll_options: nil,
                poll_counts: nil,
                my_vote: nil,
                reactions: [ChatReactionSummary(emoji: "🦙", count: 3, reacted_by_me: false)],
                created_at: iso.string(from: base.addingTimeInterval(-3600))
            ),
        ]
    }

    static let sampleFamilies: [DirectoryFamily] = [
        DirectoryFamily(
            id: 1,
            family_last_name: "Anderson",
            home_congregation: "Springfield Church of Christ",
            city: "Springfield",
            state: "IL",
            city_state: "Springfield, IL",
            photo_url: nil,
            directory_blurb: "Excited for another year at the lake with our Rendezvous family.",
            husband_first_name: "Mark",
            wife_first_name: "Sarah",
            email: nil,
            formatted_address: "Springfield, IL",
            contact_phones: [],
            member_count: 5,
            member_names: ["Mark", "Sarah", "Emma", "Noah", "Lily"]
        ),
        DirectoryFamily(
            id: 2,
            family_last_name: "Bennett",
            home_congregation: "Peoria Church of Christ",
            city: "Peoria",
            state: "IL",
            city_state: "Peoria, IL",
            photo_url: nil,
            directory_blurb: "First time attending — can't wait to meet everyone.",
            husband_first_name: "James",
            wife_first_name: "Rachel",
            email: nil,
            formatted_address: "Peoria, IL",
            contact_phones: [],
            member_count: 4,
            member_names: ["James", "Rachel", "Olivia", "Ethan"]
        ),
        DirectoryFamily(
            id: 3,
            family_last_name: "Carter",
            home_congregation: "Champaign Church of Christ",
            city: "Champaign",
            state: "IL",
            city_state: "Champaign, IL",
            photo_url: nil,
            directory_blurb: nil,
            husband_first_name: "David",
            wife_first_name: "Amy",
            email: nil,
            formatted_address: "Champaign, IL",
            contact_phones: [],
            member_count: 3,
            member_names: ["David", "Amy", "Grace"]
        ),
    ]
}
