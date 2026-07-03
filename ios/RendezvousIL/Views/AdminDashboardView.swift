import Clerk
import SwiftUI

struct AdminDashboardView: View {
    @Environment(AppSession.self) private var session

    @State private var dashboard: AdminDashboardResponse?
    @State private var isLoading = false
    @State private var errorMessage: String?

    private static let currency: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        return formatter
    }()

    var body: some View {
        Group {
            if !session.isSignedIn {
                adminSignIn
            } else if !session.canViewDashboard {
                accessDenied
            } else if let dashboard {
                dashboardContent(dashboard)
            } else if isLoading {
                ProgressView("Loading dashboard…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                emptyState
            }
        }
        .navigationTitle("Admin")
        .navigationBarTitleDisplayMode(.large)
        .background(Color(.systemGroupedBackground))
        .refreshable {
            await loadDashboard(force: true)
        }
        .task {
            await session.refreshAuth()
            await loadDashboard(force: false)
        }
    }

    private var adminSignIn: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                headerCard(
                    title: "Admin sign-in",
                    subtitle: "Sign in with your Rendezvous admin account. Your Clerk user needs an admin role (admin, editor, viewer, or check-in)."
                )

                ClerkAuthPanel(mode: .signIn)
                    .frame(minHeight: 360)

                Link(destination: AppConfig.url(for: "/admin")) {
                    Label("Open full admin on web", systemImage: "safari")
                }
                .font(.subheadline)
            }
            .padding(20)
        }
    }

    private var accessDenied: some View {
        VStack(alignment: .leading, spacing: 12) {
            Image(systemName: "lock.shield")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("Admin access required")
                .font(.title3.weight(.semibold))
            Text("Your account is signed in but does not have dashboard permissions. Ask a full admin to assign a role in Admin → Users on the website.")
                .foregroundStyle(.secondary)
            if let name = session.adminName {
                Text("Signed in as \(name)")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(20)
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            if let errorMessage {
                Text(errorMessage)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            Button("Try again") {
                Task { await loadDashboard(force: true) }
            }
            .buttonStyle(.borderedProminent)
            .tint(BrandColors.lake)
        }
        .padding(20)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func dashboardContent(_ payload: AdminDashboardResponse) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                hero(payload)
                registrationProgressCard(payload)
                statsGrid(payload.summary)
                actionItemsCard(payload.summary)
                lodgingCard(payload.summary.lodgingBreakdown)
                quickLinks
                footer(payload)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
    }

    private func hero(_ payload: AdminDashboardResponse) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Rendezvous \(payload.summary.eventYear)")
                    .font(.system(.title, design: .serif))
                    .fontWeight(.semibold)
                    .foregroundStyle(BrandColors.lake)
                Spacer()
                roleBadge(payload.admin.role)
            }

            Text("Planning overview for staff and organizers.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            if !payload.admin.fullName.isEmpty {
                Label(payload.admin.fullName, systemImage: "person.crop.circle")
                    .font(.footnote)
                    .foregroundStyle(BrandColors.coralInk)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(BrandColors.lakeLight)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(BrandColors.lake.opacity(0.2), lineWidth: 1)
        )
    }

    private func registrationProgressCard(_ payload: AdminDashboardResponse) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Registration goal", systemImage: "target")
                    .font(.headline)
                    .foregroundStyle(BrandColors.lake)
                Spacer()
                Text("\(payload.summary.registrations) / \(payload.summary.registrationGoal)")
                    .font(.subheadline.weight(.semibold))
            }

            ProgressView(value: min(payload.registrationProgress, 100), total: 100)
                .tint(BrandColors.coral)

            HStack(spacing: 16) {
                miniStat(title: "Returning", value: payload.summary.returningFamilies)
                miniStat(title: "New", value: payload.summary.newFamilies)
                miniStat(title: "Express", value: payload.summary.expressRegistrations)
            }
        }
        .adminCardStyle()
    }

    private func statsGrid(_ summary: AdminDashboardSummaryPayload) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("At a glance")
                .font(.headline)
                .foregroundStyle(BrandColors.lake)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                statTile(
                    title: "Families",
                    value: "\(summary.totalFamilies)",
                    icon: "person.3.fill",
                    tint: BrandColors.lake
                )
                statTile(
                    title: "Members",
                    value: "\(summary.totalMembers)",
                    icon: "person.2.fill",
                    tint: BrandColors.lake
                )
                statTile(
                    title: "Registered",
                    value: "\(summary.registrations)",
                    icon: "checkmark.seal.fill",
                    tint: BrandColors.coral
                )
                statTile(
                    title: "Attendees",
                    value: "\(summary.registeredAttendees)",
                    icon: "figure.2.and.child.holdinghands",
                    tint: BrandColors.coral
                )
                statTile(
                    title: "Checked in",
                    value: "\(summary.checkedIn)",
                    icon: "person.badge.key.fill",
                    tint: BrandColors.coralInk
                )
                statTile(
                    title: "Fully paid",
                    value: "\(summary.fullyPaid)",
                    icon: "dollarsign.circle.fill",
                    tint: BrandColors.coralInk
                )
            }
        }
    }

    private func actionItemsCard(_ summary: AdminDashboardSummaryPayload) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Needs attention")
                .font(.headline)
                .foregroundStyle(BrandColors.lake)

            actionRow(
                title: "Pending family changes",
                value: summary.pendingChanges,
                icon: "pencil.and.list.clipboard",
                link: "/admin/pending-changes",
                highlight: summary.pendingChanges > 0
            )
            actionRow(
                title: "Active announcements",
                value: summary.activeAnnouncements,
                icon: "megaphone.fill",
                link: "/admin/announcements"
            )
            actionRow(
                title: "Feedback responses",
                value: summary.feedbackCount,
                icon: "star.bubble.fill",
                link: "/admin/feedback",
                detail: summary.feedbackCount > 0 ? String(format: "%.1f avg rating", summary.avgRating) : nil
            )
        }
        .adminCardStyle()
    }

    private func lodgingCard(_ lodging: AdminLodgingBreakdownPayload) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Lodging mix")
                .font(.headline)
                .foregroundStyle(BrandColors.lake)

            lodgingRow(label: "Motel", count: lodging.motel, icon: "bed.double.fill")
            lodgingRow(label: "RV", count: lodging.rv, icon: "truck.box.fill")
            lodgingRow(label: "Tent", count: lodging.tent, icon: "tent.fill")
            lodgingRow(label: "Drive-in", count: lodging.drivein, icon: "car.fill")
        }
        .adminCardStyle()
    }

    private var quickLinks: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Open on web")
                .font(.headline)
                .foregroundStyle(BrandColors.lake)

            Link(destination: AppConfig.url(for: "/admin")) {
                linkRow(title: "Full admin dashboard", icon: "chart.bar.doc.horizontal")
            }
            Link(destination: AppConfig.url(for: "/admin/registrations")) {
                linkRow(title: "Registrations", icon: "list.bullet.rectangle")
            }
            if session.canManageUsers {
                NavigationLink {
                    AdminUsersView()
                } label: {
                    linkRow(title: "User management", icon: "person.2.badge.gearshape")
                }
            }
            if session.canCheckIn {
                Link(destination: AppConfig.url(for: "/admin/checkin")) {
                    linkRow(title: "Check-in station", icon: "person.badge.key")
                }
            }
        }
        .adminCardStyle()
    }

    private func footer(_ payload: AdminDashboardResponse) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Revenue")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text(formatCurrency(payload.summary.totalRevenue))
                    .font(.subheadline.weight(.semibold))
            }
            HStack {
                Text("Deposits collected")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(formatCurrency(payload.summary.depositsPaid))
                    .font(.footnote)
            }
            HStack {
                Text("Balance due")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(formatCurrency(payload.summary.balanceDue))
                    .font(.footnote)
            }
            Text("Updated \(formattedUpdatedAt(payload.updatedAt))")
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .padding(.top, 4)
        }
        .adminCardStyle()
    }

    private func headerCard(title: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.title2.weight(.semibold))
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private func roleBadge(_ role: String) -> some View {
        Text(role.uppercased())
            .font(.caption2.weight(.bold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(BrandColors.coral.opacity(0.15), in: Capsule())
            .foregroundStyle(BrandColors.coralInk)
    }

    private func miniStat(title: String, value: Int) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("\(value)")
                .font(.subheadline.weight(.semibold))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func statTile(title: String, value: String, icon: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(tint)
            Text(value)
                .font(.title2.weight(.bold))
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func actionRow(
        title: String,
        value: Int,
        icon: String,
        link: String,
        highlight: Bool = false,
        detail: String? = nil
    ) -> some View {
        Link(destination: AppConfig.url(for: link)) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .foregroundStyle(highlight ? BrandColors.coral : BrandColors.lake)
                    .frame(width: 24)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.primary)
                    if let detail {
                        Text(detail)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
                Text("\(value)")
                    .font(.headline)
                    .foregroundStyle(highlight ? BrandColors.coral : .primary)
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
        }
    }

    private func lodgingRow(label: String, count: Int, icon: String) -> some View {
        HStack {
            Label(label, systemImage: icon)
                .font(.subheadline)
            Spacer()
            Text("\(count)")
                .font(.subheadline.weight(.semibold))
        }
    }

    private func linkRow(title: String, icon: String) -> some View {
        HStack {
            Label(title, systemImage: icon)
                .font(.subheadline.weight(.medium))
            Spacer()
            Image(systemName: "arrow.up.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.tertiary)
        }
    }

    private func formatCurrency(_ amount: Double) -> String {
        Self.currency.string(from: NSNumber(value: amount)) ?? "$\(Int(amount))"
    }

    private func formattedUpdatedAt(_ iso: String) -> String {
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let fallback = ISO8601DateFormatter()
        let date = parser.date(from: iso) ?? fallback.date(from: iso) ?? Date()
        let display = RelativeDateTimeFormatter()
        display.unitsStyle = .short
        return display.localizedString(for: date, relativeTo: Date())
    }

    private func loadDashboard(force: Bool) async {
        guard session.canViewDashboard, let client = session.apiClient else { return }
        if force || dashboard == nil {
            isLoading = dashboard == nil
        }
        errorMessage = nil
        defer { isLoading = false }

        do {
            dashboard = try await client.getAdminDashboard()
        } catch {
            if dashboard == nil {
                errorMessage = error.localizedDescription
            }
        }
    }
}

private extension View {
    func adminCardStyle() -> some View {
        frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color(.secondarySystemGroupedBackground))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(BrandColors.cardBorder, lineWidth: 1)
            )
    }
}

#Preview {
    NavigationStack {
        AdminDashboardView()
            .environment(AppSession())
    }
}
