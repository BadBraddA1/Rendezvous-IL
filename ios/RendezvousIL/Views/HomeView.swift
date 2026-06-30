import SwiftUI

struct HomeView: View {
    @Binding var selectedTab: AppTab

    private let facts: [(icon: String, title: String, detail: String)] = [
        ("calendar", "5 days / 4 nights", "Fellowship, worship, recreation, and encouragement."),
        ("mappin.and.ellipse", "Lake Williamson", "Lodging, dining, and recreation on site."),
        ("person.3.fill", "All ages welcome", "A family retreat with activities for every age."),
        ("fork.knife", "Meals included", "Buffet-style dining — no cooking or cleanup."),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    hero
                    countdownCard
                    quickActions
                    factsSection
                    planningSection
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Rendezvous")
            .navigationBarTitleDisplayMode(.large)
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Rendezvous \(AppConfig.eventYear)")
                .font(.system(.largeTitle, design: .serif))
                .fontWeight(.semibold)
                .foregroundStyle(BrandColors.lake)

            Text("Christian Homeschool Family Retreat")
                .font(.title3)
                .foregroundStyle(.secondary)

            Text(AppConfig.eventDates)
                .font(.headline)
                .foregroundStyle(BrandColors.coralInk)

            Text(AppConfig.location)
                .font(.subheadline)
                .foregroundStyle(.secondary)
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

    private var countdownCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Registration opens \(AppConfig.registrationOpens)", systemImage: "bell.badge")
                .font(.headline)
                .foregroundStyle(BrandColors.lake)

            Text("Plan ahead for \(AppConfig.eventYear). Theme: \(AppConfig.theme) (Bible Bowl).")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(BrandColors.warmSurface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(BrandColors.coral.opacity(0.25), lineWidth: 1)
        )
    }

    private var quickActions: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick links")
                .font(.headline)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                QuickActionButton(title: "Schedule", icon: "calendar", color: BrandColors.lake) {
                    selectedTab = .schedule
                }
                QuickActionButton(title: "Updates", icon: "bell.badge", color: BrandColors.coral) {
                    selectedTab = .updates
                }
                QuickActionButton(title: "FAQ", icon: "questionmark.circle", color: BrandColors.lake) {
                    selectedTab = .more
                }
                QuickActionButton(title: "Calculator", icon: "dollarsign.circle", color: BrandColors.coral) {
                    selectedTab = .more
                }
            }
        }
    }

    private var factsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("What to expect")
                .font(.headline)

            ForEach(facts, id: \.title) { fact in
                HStack(alignment: .top, spacing: 14) {
                    Image(systemName: fact.icon)
                        .font(.title3)
                        .foregroundStyle(BrandColors.lake)
                        .frame(width: 28)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(fact.title)
                            .font(.subheadline.weight(.semibold))
                        Text(fact.detail)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color(.secondarySystemGroupedBackground))
                )
            }
        }
    }

    private var planningSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("2027 at a glance")
                .font(.headline)

            VStack(spacing: 0) {
                planningRow(label: "Dates", value: AppConfig.eventDates)
                Divider().padding(.leading, 16)
                planningRow(label: "Registration", value: AppConfig.registrationOpens)
                Divider().padding(.leading, 16)
                planningRow(label: "Bible Bowl", value: AppConfig.theme)
                Divider().padding(.leading, 16)
                planningRow(label: "Location", value: "Lake Williamson, Carlinville, IL")
            }
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color(.secondarySystemGroupedBackground))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(BrandColors.cardBorder, lineWidth: 1)
            )
        }
    }

    private func planningRow(label: String, value: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(label)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(BrandColors.lake)
                .frame(width: 100, alignment: .leading)
            Text(value)
                .font(.subheadline)
                .foregroundStyle(.primary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

private struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                Text(title)
                    .font(.caption.weight(.semibold))
                    .multilineTextAlignment(.center)
            }
            .foregroundStyle(color)
            .frame(maxWidth: .infinity, minHeight: 88)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color(.secondarySystemGroupedBackground))
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    HomeView(selectedTab: .constant(.home))
}
