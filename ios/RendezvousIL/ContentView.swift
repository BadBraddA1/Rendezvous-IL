import SwiftUI

extension Notification.Name {
    static let rendezvousDeepLink = Notification.Name("rendezvousDeepLink")
}

/// Signed-in tab shell — schedule, chat, directory, and retreat tools.
struct MainTabView: View {
    @Environment(RendezvousRepository.self) private var repository
    @State private var selectedTab: AppTab = .home

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView(selectedTab: $selectedTab)
                .tabItem { Label("Home", systemImage: "house.fill") }
                .tag(AppTab.home)

            ScheduleView()
                .tabItem { Label("Schedule", systemImage: "calendar") }
                .tag(AppTab.schedule)

            UpdatesView()
                .tabItem { Label("Updates", systemImage: "bell.badge") }
                .tag(AppTab.updates)

            ChatListView()
                .tabItem { Label("Chat", systemImage: "bubble.left.and.bubble.right.fill") }
                .tag(AppTab.chat)

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
    case home, schedule, updates, chat, more
}

#Preview {
    MainTabView()
        .environment(RendezvousRepository())
        .environment(AppSession())
}
