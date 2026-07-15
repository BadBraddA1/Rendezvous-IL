import SwiftUI

extension Notification.Name {
    static let rendezvousDeepLink = Notification.Name("rendezvousDeepLink")
}

/// Signed-in tab shell — Schedule is the center tab; Directory is a primary tab.
struct MainTabView: View {
    @Environment(RendezvousRepository.self) private var repository
    @State private var selectedTab: AppTab = {
        if AppStoreScreenshotMode.isEnabled { return AppStoreScreenshotMode.initialTab }
        if ChatDemoMode.isEnabled { return .chat }
        return .schedule
    }()

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView(selectedTab: $selectedTab)
                .tabItem { Label("Home", systemImage: "house.fill") }
                .tag(AppTab.home)

            ChatListView()
                .tabItem { Label("Chat", systemImage: "bubble.left.and.bubble.right.fill") }
                .tag(AppTab.chat)

            ScheduleView()
                .tabItem { Label("Schedule", systemImage: "calendar") }
                .tag(AppTab.schedule)

            NavigationStack {
                DirectoryView()
            }
            .tabItem { Label("Directory", systemImage: "person.3.fill") }
            .tag(AppTab.directory)

            MoreView()
                .tabItem { Label("More", systemImage: "ellipsis.circle.fill") }
                .tag(AppTab.more)
        }
        .onReceive(NotificationCenter.default.publisher(for: .rendezvousDeepLink)) { note in
            if let tab = note.userInfo?["tab"] as? AppTab {
                selectedTab = tab
            } else if let raw = note.userInfo?["tab"] as? String, let tab = AppTab(rawValue: raw) {
                selectedTab = tab
            }
        }
        .task {
            await repository.bootstrap()
            DeepLinkRouter.flushPending()
        }
    }
}

enum AppTab: String, Hashable {
    case home, chat, schedule, directory, more

    /// Older deep links used `updates` — map to schedule (now includes live updates).
    init?(rawValue: String) {
        switch rawValue {
        case "home": self = .home
        case "chat": self = .chat
        case "schedule", "updates": self = .schedule
        case "directory": self = .directory
        case "more": self = .more
        default: return nil
        }
    }
}

#Preview {
    MainTabView()
        .environment(RendezvousRepository())
        .environment(AppSession())
}
