import SwiftUI

extension Notification.Name {
    static let rendezvousDeepLink = Notification.Name("rendezvousDeepLink")
}

struct ContentView: View {
    @State private var repository = RendezvousRepository()
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

            MoreView()
                .tabItem { Label("More", systemImage: "ellipsis.circle.fill") }
                .tag(AppTab.more)
        }
        .environment(repository)
        .onReceive(NotificationCenter.default.publisher(for: .rendezvousDeepLink)) { note in
            if let tab = note.userInfo?["tab"] as? AppTab {
                selectedTab = tab
            }
        }
        .task {
            await repository.loadScheduleBundle()
            await repository.loadScheduleExtras()
        }
    }
}

enum AppTab: Hashable {
    case home, schedule, updates, more
}

#Preview {
    ContentView()
}
