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
            }
        }
        .task {
            await repository.loadUpdates()
        }
    }
}

enum AppTab: Hashable {
    case home, schedule, updates, chat, more
}

#Preview {
    MainTabView()
        .environment(RendezvousRepository())
        .environment(AppSession())
}
