import SwiftUI

extension Notification.Name {
    static let rendezvousDeepLink = Notification.Name("rendezvousDeepLink")
}

/// Signed-in tab shell — Schedule is the center tab; Directory is a primary tab.
struct MainTabView: View {
    @Environment(AppSession.self) private var session
    @Environment(RendezvousRepository.self) private var repository
    @State private var selectedTab: AppTab = {
        if AppStoreScreenshotMode.isEnabled { return AppStoreScreenshotMode.initialTab }
        if ChatDemoMode.isEnabled { return .chat }
        return .schedule
    }()
    /// Tabs that have been opened at least once (Schedule always mounted for instant paint).
    @State private var mountedTabs: Set<AppTab> = [.schedule]

    var body: some View {
        TabView(selection: $selectedTab) {
            lazyTab(.home) {
                HomeView(selectedTab: $selectedTab)
            }
            .tabItem { Label("Home", systemImage: "house.fill") }
            .tag(AppTab.home)

            lazyTab(.chat) {
                ChatListView()
            }
            .tabItem { Label("Chat", systemImage: "bubble.left.and.bubble.right.fill") }
            .tag(AppTab.chat)

            ScheduleView()
                .tabItem { Label("Schedule", systemImage: "calendar") }
                .tag(AppTab.schedule)

            lazyTab(.directory) {
                NavigationStack {
                    DirectoryView()
                }
            }
            .tabItem { Label("Directory", systemImage: "person.3.fill") }
            .tag(AppTab.directory)

            lazyTab(.more) {
                MoreView()
            }
            .tabItem { Label("More", systemImage: "ellipsis.circle.fill") }
            .tag(AppTab.more)
        }
        .onChange(of: selectedTab) { _, tab in
            mountedTabs.insert(tab)
        }
        .onReceive(NotificationCenter.default.publisher(for: .rendezvousDeepLink)) { note in
            if let tab = note.userInfo?["tab"] as? AppTab {
                mountedTabs.insert(tab)
                selectedTab = tab
            } else if let raw = note.userInfo?["tab"] as? String, let tab = AppTab(rawValue: raw) {
                mountedTabs.insert(tab)
                selectedTab = tab
            }
        }
        .task {
            mountedTabs.insert(selectedTab)
            await repository.bootstrap()
            DeepLinkRouter.flushPending()
            // Keep chat disk cache warm after first paint (weak Wi‑Fi: open Chat from cache).
            if let client = session.apiClient {
                await ChatCachePrefetcher.refresh(using: client)
            }
        }
    }

    @ViewBuilder
    private func lazyTab<Content: View>(
        _ tab: AppTab,
        @ViewBuilder content: () -> Content
    ) -> some View {
        if mountedTabs.contains(tab) || selectedTab == tab {
            content()
        } else {
            Color.clear
                .accessibilityHidden(true)
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
