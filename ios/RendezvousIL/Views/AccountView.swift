import SwiftUI

struct AccountView: View {
    @Environment(AppSession.self) private var session

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                profileCard

                VStack(alignment: .leading, spacing: 12) {
                    infoRow(icon: "calendar", title: "Event dates", value: AppConfig.eventDates)
                    infoRow(icon: "book.closed", title: "Bible Bowl", value: AppConfig.theme)
                    infoRow(icon: "mappin.and.ellipse", title: "Location", value: AppConfig.location)
                }
                .padding()
                .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))

                VStack(spacing: 12) {
                    accountLink(
                        title: "Family dashboard on web",
                        icon: "safari",
                        url: AppConfig.url(for: "/account"),
                        prominent: true
                    )
                    accountLink(
                        title: "Manage registration",
                        icon: "doc.text",
                        url: AppConfig.url(for: "/register")
                    )
                    accountLink(
                        title: "Change password on web",
                        icon: "key",
                        url: AppConfig.url(for: "/account/settings")
                    )
                }

                VStack(spacing: 12) {
                    NavigationLink {
                        FamilyDirectoryManageView()
                    } label: {
                        inAppLinkLabel(title: "Upload directory photo", icon: "camera.fill")
                    }

                    NavigationLink {
                        DirectoryView()
                    } label: {
                        inAppLinkLabel(title: "Browse family directory", icon: "person.3.fill")
                    }

                    NavigationLink {
                        NotificationSettingsView()
                    } label: {
                        inAppLinkLabel(title: "Notifications & widgets", icon: "bell.badge")
                    }
                }

                contactBlock
            }
            .padding()
        }
        .navigationTitle("Account")
        .refreshable {
            await session.refreshAdminStatus()
        }
    }

    private var profileCard: some View {
        HStack(spacing: 16) {
            ProfileAvatarLabel(name: session.userDisplayName ?? session.userEmail)

            VStack(alignment: .leading, spacing: 4) {
                Text(session.userDisplayName ?? "Signed in")
                    .font(.title3.weight(.semibold))
                if let email = session.userEmail {
                    Text(email)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                if session.isAdmin, let role = session.adminRole {
                    Label("Staff: \(role.capitalized)", systemImage: "person.badge.key")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(BrandColors.coralInk)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(BrandColors.lakeLight.opacity(0.6), in: RoundedRectangle(cornerRadius: 14))
    }

    private func infoRow(icon: String, title: String, value: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(BrandColors.coral)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text(value)
                    .font(.subheadline)
            }
        }
    }

    private func accountLink(title: String, icon: String, url: URL, prominent: Bool = false) -> some View {
        Link(destination: url) {
            Group {
                if prominent {
                    Label(title, systemImage: icon)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(BrandColors.lake, in: RoundedRectangle(cornerRadius: 12))
                        .foregroundStyle(.white)
                } else {
                    inAppLinkLabel(title: title, icon: icon)
                }
            }
        }
    }

    private func inAppLinkLabel(title: String, icon: String) -> some View {
        Label(title, systemImage: icon)
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
            .foregroundStyle(BrandColors.lake)
    }

    private var contactBlock: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Questions?")
                .font(.headline)
            Link(BundledContent.contactEmail, destination: URL(string: "mailto:\(BundledContent.contactEmail)")!)
            Link(BundledContent.contactPhone, destination: URL(string: "tel:+12179355058")!)
        }
        .font(.subheadline)
    }
}

#Preview {
    NavigationStack { AccountView().environment(AppSession()) }
}
