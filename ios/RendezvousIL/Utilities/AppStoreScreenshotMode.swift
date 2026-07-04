import Foundation

/// Launch with `-AppStoreScreenshots` (and optional `-ScreenshotTab <name>`) to capture marketing frames.
/// Not used in normal App Store builds unless those args are passed.
enum AppStoreScreenshotMode {
    static var isEnabled: Bool {
        ProcessInfo.processInfo.arguments.contains("-AppStoreScreenshots")
    }

    /// welcome | home | schedule | chat | directory | more
    static var tabName: String {
        let args = ProcessInfo.processInfo.arguments
        guard let index = args.firstIndex(of: "-ScreenshotTab"),
              args.index(after: index) < args.endIndex
        else {
            return "schedule"
        }
        return args[args.index(after: index)].lowercased()
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
            can_moderate: false
        ),
    ]

    static let sampleFamilies: [DirectoryFamily] = [
        DirectoryFamily(
            id: 1,
            family_last_name: "Anderson",
            home_congregation: "Springfield Church of Christ",
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
