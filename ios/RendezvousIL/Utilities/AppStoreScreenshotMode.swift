import Foundation

/// Offline demo for App Store screenshots **and** App Review.
///
/// Enable with any of:
/// - Launch arg `-AppReviewDemo` (best for Review Notes: tell Apple to add this arg in Xcode if they use a scheme; for TestFlight use the deep link / welcome button)
/// - Launch arg `-AppStoreScreenshots` (+ optional `-ScreenshotTab`)
/// - UserDefaults `AppReviewDemo` / `AppStoreScreenshots` (simctl / scripts)
/// - Deep link `rendezvousil://app-review-demo`
/// - Welcome screen **Continue with demo**
///
/// Not used in normal attendee launches unless one of those is set.
enum AppStoreScreenshotMode {
    private static let screenshotEnabledKey = "AppStoreScreenshots"
    private static let reviewDemoKey = "AppReviewDemo"
    private static let tabKey = "ScreenshotTab"

    /// Sample sender ids for offline chat (reviewer composes as Alex).
    static let demoReviewerClerkId = "demo-alex"
    static let demoOrganizerClerkId = "demo-organizer"
    static let demoFamilyClerkId = "demo-family"

    static var isEnabled: Bool {
        if ProcessInfo.processInfo.arguments.contains("-AppReviewDemo") { return true }
        if ProcessInfo.processInfo.arguments.contains("-AppStoreScreenshots") { return true }
        if UserDefaults.standard.bool(forKey: reviewDemoKey) { return true }
        return UserDefaults.standard.bool(forKey: screenshotEnabledKey)
    }

    /// True when the review-specific flag/arg was used (still offline demo; same sample data).
    static var isAppReviewDemo: Bool {
        if ProcessInfo.processInfo.arguments.contains("-AppReviewDemo") { return true }
        return UserDefaults.standard.bool(forKey: reviewDemoKey)
    }

    /// Persist for this install so App Review can reopen the app and stay in demo.
    static func enableAppReviewDemo() {
        UserDefaults.standard.set(true, forKey: reviewDemoKey)
    }

    static func clearAppReviewDemo() {
        UserDefaults.standard.removeObject(forKey: reviewDemoKey)
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
        // App Review demo opens Chat so reviewers can exercise UGC immediately.
        if isAppReviewDemo { return "chat" }
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

    static func sampleMessages(for channelId: String) -> [ChatMessage] {
        let iso = ISO8601DateFormatter()
        let base = Date()
        switch channelId {
        case "year-2026":
            return [
                ChatMessage(
                    id: "demo-2026-1",
                    channel_id: channelId,
                    sender_clerk_id: demoOrganizerClerkId,
                    sender_display_name: "Rendezvous Team",
                    sender_avatar_url: nil,
                    body: "Welcome back, families — what a week at the lake. Safe travels home!",
                    image_url: nil,
                    is_announcement: true,
                    created_at: iso.string(from: base.addingTimeInterval(-172_800))
                ),
                ChatMessage(
                    id: "demo-2026-2",
                    channel_id: channelId,
                    sender_clerk_id: demoFamilyClerkId,
                    sender_display_name: "Sarah Anderson",
                    sender_avatar_url: nil,
                    body: "Thanks for another great week. Already counting down to next year!",
                    image_url: nil,
                    is_announcement: false,
                    created_at: iso.string(from: base.addingTimeInterval(-86_400))
                ),
            ]
        default:
            return [
                ChatMessage(
                    id: "demo-2027-1",
                    channel_id: channelId,
                    sender_clerk_id: demoOrganizerClerkId,
                    sender_display_name: "Rendezvous Team",
                    sender_avatar_url: nil,
                    body: "Welcome to Rendezvous 2027 year chat! Share ride ideas, cabin questions, and encouragement here.",
                    image_url: nil,
                    is_announcement: true,
                    created_at: iso.string(from: base.addingTimeInterval(-7200))
                ),
                ChatMessage(
                    id: "demo-2027-2",
                    channel_id: channelId,
                    sender_clerk_id: demoFamilyClerkId,
                    sender_display_name: "James Bennett",
                    sender_avatar_url: nil,
                    body: "Looking forward to seeing everyone at the lake!",
                    image_url: nil,
                    is_announcement: false,
                    created_at: iso.string(from: base.addingTimeInterval(-3600))
                ),
                ChatMessage(
                    id: "demo-2027-3",
                    channel_id: channelId,
                    sender_clerk_id: demoReviewerClerkId,
                    sender_display_name: "Alex",
                    sender_avatar_url: nil,
                    body: "Our family is excited — first year attending.",
                    image_url: nil,
                    is_announcement: false,
                    created_at: iso.string(from: base.addingTimeInterval(-1800))
                ),
            ]
        }
    }

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
