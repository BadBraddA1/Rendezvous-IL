import SwiftUI

struct MoreView: View {
    @Environment(AppSession.self) private var session

    var body: some View {
        NavigationStack {
            List {
                Section("Plan your trip") {
                    NavigationLink { CalculatorView() } label: {
                        Label("Cost calculator", systemImage: "dollarsign.circle")
                    }
                    NavigationLink { BibleBowlView() } label: {
                        Label("Bible Bowl", systemImage: "book.closed")
                    }
                    NavigationLink { FAQView() } label: {
                        Label("FAQ", systemImage: "questionmark.circle")
                    }
                    NavigationLink { AboutView() } label: {
                        Label("About Rendezvous", systemImage: "info.circle")
                    }
                }

                Section("Account") {
                    NavigationLink { CheckInView() } label: {
                        Label("Staff check-in", systemImage: "person.badge.key")
                    }
                    NavigationLink { AccountView() } label: {
                        Label("Family account", systemImage: "person.crop.circle")
                    }
                    NavigationLink { NotificationSettingsView() } label: {
                        Label("Notifications & widgets", systemImage: "bell.badge")
                    }
                }

                Section("Links") {
                    Link(destination: AppConfig.url(for: "/schedule/print")) {
                        Label("Download schedule PDF", systemImage: "doc.richtext")
                    }
                    Link(destination: URL(string: "https://www.facebook.com/groups/RendezvousIL")!) {
                        Label("Facebook group", systemImage: "person.2")
                    }
                    Link(destination: AppConfig.baseURL) {
                        Label("rendezvousil.com", systemImage: "safari")
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
