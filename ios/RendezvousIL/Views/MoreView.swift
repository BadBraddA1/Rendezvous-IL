import SwiftUI

struct MoreView: View {
    @Environment(AppSession.self) private var session

    var body: some View {
        NavigationStack {
            List {
                Section("Community") {
                    NavigationLink { DirectoryView() } label: {
                        Label("Family directory", systemImage: "person.3.fill")
                    }
                    NavigationLink { FamilyDirectoryManageView() } label: {
                        Label("Your directory photo", systemImage: "camera.fill")
                    }
                    NavigationLink { AccountView() } label: {
                        Label("Family account", systemImage: "person.crop.circle")
                    }
                }

                Section("Retreat resources") {
                    NavigationLink { BibleBowlView() } label: {
                        Label("Bible Bowl (\(AppConfig.theme))", systemImage: "book.closed")
                    }
                    NavigationLink { FAQView() } label: {
                        Label("FAQ", systemImage: "questionmark.circle")
                    }
                    NavigationLink { AboutView() } label: {
                        Label("About Rendezvous", systemImage: "info.circle")
                    }
                    NavigationLink { NotificationSettingsView() } label: {
                        Label("Notifications & widgets", systemImage: "bell.badge")
                    }
                }

                if session.canViewDashboard {
                    Section("Admin") {
                        NavigationLink { AdminDashboardView() } label: {
                            Label("Admin dashboard", systemImage: "chart.bar.doc.horizontal.fill")
                        }
                        if session.canManageUsers {
                            NavigationLink { AdminUsersView() } label: {
                                Label("User management", systemImage: "person.2.badge.gearshape")
                            }
                        }
                    }
                }

                if session.canCheckIn {
                    Section("Staff") {
                        NavigationLink { CheckInView() } label: {
                            Label("Check-in station", systemImage: "person.badge.key")
                        }
                    }
                }

                Section("Links") {
                    Link(destination: AppConfig.url(for: "/schedule/print")) {
                        Label("Schedule PDF", systemImage: "doc.richtext")
                    }
                    Link(destination: URL(string: "https://www.facebook.com/groups/RendezvousIL")!) {
                        Label("Facebook group", systemImage: "person.2")
                    }
                    Link(destination: AppConfig.baseURL) {
                        Label("rendezvousil.com", systemImage: "safari")
                    }
                }

                Section {
                    Button(role: .destructive) {
                        Task { await session.signOut() }
                    } label: {
                        Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("More")
        }
    }
}

#Preview {
    MoreView()
        .environment(RendezvousRepository())
        .environment(AppSession())
}
