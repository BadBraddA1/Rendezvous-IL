import SwiftUI

struct AccountView: View {
    @Environment(AppSession.self) private var session
    @State private var yearHub: YearHubResponse?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                profileCard

                if let hub = yearHub, let reg = hub.registration {
                    registrationSummary(reg)
                }

                VStack(alignment: .leading, spacing: 12) {
                    infoRow(icon: "calendar", title: "Event dates", value: AppConfig.eventDates)
                    infoRow(icon: "book.closed", title: "Bible Bowl", value: AppConfig.theme)
                    infoRow(icon: "mappin.and.ellipse", title: "Location", value: AppConfig.location)
                }
                .padding()
                .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))

                VStack(spacing: 12) {
                    NavigationLink {
                        FamilyProfileView()
                    } label: {
                        Label("Manage family members", systemImage: "person.3.fill")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(BrandColors.lake, in: RoundedRectangle(cornerRadius: 12))
                            .foregroundStyle(.white)
                    }

                    NavigationLink {
                        FamilyDirectoryManageView()
                    } label: {
                        inAppLinkLabel(title: "Directory photo & listing", icon: "camera.fill")
                    }

                    NavigationLink {
                        AttendeeMapView()
                    } label: {
                        inAppLinkLabel(title: "Attendee map", icon: "map")
                    }

                    NavigationLink {
                        AppFeedbackView()
                    } label: {
                        inAppLinkLabel(title: "App feedback", icon: "bubble.left.and.exclamationmark")
                    }

                    Button {
                        Task { await WebHandoff.open(path: "/register", session: session) }
                    } label: {
                        inAppLinkLabel(title: "Register / manage registration", icon: "doc.text")
                    }

                    Button {
                        Task { await WebHandoff.open(path: "/account/express-registration", session: session) }
                    } label: {
                        inAppLinkLabel(title: "Express registration on web", icon: "bolt.fill")
                    }

                    Button {
                        Task { await WebHandoff.open(path: "/account/settings", session: session) }
                    } label: {
                        inAppLinkLabel(title: "Change password on web", icon: "key")
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
        .task { await loadHub() }
        .refreshable {
            await session.refreshAdminStatus()
            await loadHub()
        }
    }

    private func registrationSummary(_ reg: YearHubRegistration) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("\(AppConfig.eventYearLabel) registration")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            Text("\(reg.familyLastName) family")
                .font(.headline)
            if let count = reg.attendeeCount {
                Text("\(count) attendees\(reg.lodgingType.map { " · \($0)" } ?? "")")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            if let status = reg.paymentStatus {
                Text(paymentLabel(status))
                    .font(.subheadline)
            }
            if let cost = reg.totalCost {
                Text(String(format: "Total: $%.2f", cost))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(BrandColors.lake)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    private func paymentLabel(_ status: String) -> String {
        switch status.lowercased() {
        case "paid", "complete", "completed": return "Payment: Paid"
        case "partial": return "Payment: Partial"
        case "unpaid", "pending": return "Payment: Unpaid"
        default: return "Payment: \(status.capitalized)"
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

    private func loadHub() async {
        guard let client = session.apiClient else {
            yearHub = nil
            return
        }
        yearHub = try? await client.getYearHub()
    }
}

#Preview {
    NavigationStack { AccountView().environment(AppSession()) }
}
