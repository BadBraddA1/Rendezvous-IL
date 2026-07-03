import SwiftUI

struct MoreView: View {
    @Environment(AppSession.self) private var session

    var body: some View {
        NavigationStack {
            List {
                Section {
                    accountHeader
                }

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
                    NavigationLink { CalculatorView() } label: {
                        Label("Cost calculator", systemImage: "dollarsign.circle")
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

    private var accountHeader: some View {
        HStack(spacing: 14) {
            ProfileAvatarLabel(name: session.userDisplayName ?? session.userEmail)

            VStack(alignment: .leading, spacing: 4) {
                Text(session.userDisplayName ?? "Your family account")
                    .font(.headline)
                if let email = session.userEmail, session.userDisplayName != nil {
                    Text(email)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                if session.isAdmin, let role = session.adminRole {
                    Text(role.capitalized)
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(BrandColors.coral.opacity(0.15))
                        .foregroundStyle(BrandColors.coralInk)
                        .clipShape(Capsule())
                }
            }

            Spacer(minLength: 0)

            NavigationLink {
                AccountView()
            } label: {
                Text("Account")
                    .font(.subheadline.weight(.medium))
            }
        }
        .padding(.vertical, 4)
    }
}

/// Circle initials avatar for profile headers.
struct ProfileAvatarLabel: View {
    let name: String?

    private var initials: String {
        guard let name, !name.isEmpty else { return "?" }
        let parts = name.split(separator: " ").prefix(2)
        let letters = parts.compactMap { $0.first }.map { String($0) }
        if letters.isEmpty, let first = name.first {
            return String(first).uppercased()
        }
        return letters.joined().uppercased()
    }

    var body: some View {
        Text(initials)
            .font(.headline.weight(.semibold))
            .foregroundStyle(BrandColors.lake)
            .frame(width: 48, height: 48)
            .background(BrandColors.lakeLight, in: Circle())
    }
}

#Preview {
    MoreView()
        .environment(RendezvousRepository())
        .environment(AppSession())
}
