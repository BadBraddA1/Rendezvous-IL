import SwiftUI

struct UpdatesView: View {
    @Environment(RendezvousRepository.self) private var repository

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    nowNextSection
                    weatherSection
                    announcementsSection
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Updates")
            .refreshable {
                await repository.loadUpdates()
            }
            .overlay {
                if repository.isLoadingUpdates {
                    ProgressView()
                }
            }
        }
    }

    private var nowNextSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Now & next")
                .font(.headline)

            RetreatNowNextSection(
                result: repository.nowNext(),
                emptyMessage: "Rendezvous \(AppConfig.eventYear) · \(AppConfig.eventDates). Live now/next during retreat week (Central Time)."
            )
        }
    }

    @ViewBuilder
    private var weatherSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Lake Williamson weather")
                .font(.headline)

            if let current = repository.weather?.current {
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    Text("\(Int(current.temp.rounded()))°")
                        .font(.system(size: 44, weight: .semibold, design: .rounded))
                        .foregroundStyle(BrandColors.lake)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(current.weather.first?.description.capitalized ?? "Conditions")
                            .font(.subheadline.weight(.medium))
                        Text("Feels like \(Int(current.feels_like.rounded()))° · Wind \(Int(current.wind_speed)) mph")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(BrandColors.lakeLight.opacity(0.5), in: RoundedRectangle(cornerRadius: 12))
            } else {
                Text("Weather loads during retreat week when you're online.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    @ViewBuilder
    private var announcementsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Announcements")
                    .font(.headline)
                Spacer()
                if !repository.liveAnnouncements.isEmpty {
                    Text("\(repository.liveAnnouncements.count)")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
            }

            if repository.liveAnnouncements.isEmpty {
                Text("No active announcements right now.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
            } else {
                ForEach(repository.liveAnnouncements) { item in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(item.title)
                                .font(.subheadline.weight(.semibold))
                            Spacer()
                            PriorityBadge(priority: item.priority)
                        }
                        Text(item.message)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }
}

struct PriorityBadge: View {
    let priority: String

    var body: some View {
        Text(priority.capitalized)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.15), in: Capsule())
            .foregroundStyle(color)
    }

    private var color: Color {
        switch priority.lowercased() {
        case "urgent": return .red
        case "high": return BrandColors.coral
        default: return BrandColors.lake
        }
    }
}

#Preview {
    UpdatesView()
        .environment(RendezvousRepository())
}
