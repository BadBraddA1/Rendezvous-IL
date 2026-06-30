import SwiftUI

struct UpdatesView: View {
    @Environment(RendezvousRepository.self) private var repository

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    nowNextSection
                    weatherSection
                    announcementsSection
                }
                .padding()
            }
            .navigationTitle("Updates")
            .refreshable {
                await repository.loadUpdates()
            }
            .task {
                await repository.loadUpdates()
            }
        }
    }

    private var nowNextSection: some View {
        let result = repository.nowNext()

        return VStack(alignment: .leading, spacing: 12) {
            Text("Now & next")
                .font(.headline)

            if let current = result.current {
                statusCard(
                    label: "Happening now",
                    title: current.title,
                    subtitle: [current.time, current.location].compactMap { $0 }.joined(separator: " · "),
                    tint: BrandColors.lake
                )
            }

            if let next = result.next {
                statusCard(
                    label: result.current == nil ? "Up next" : "Then",
                    title: next.title,
                    subtitle: [next.day, next.time, next.location].compactMap { $0 }.joined(separator: " · "),
                    tint: BrandColors.coral
                )
            }

            if result.current == nil && result.next == nil {
                Text("Event week: May 3–7, 2027. Live now/next appears during the retreat (Central Time).")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    @ViewBuilder
    private var weatherSection: some View {
        if let current = repository.weather?.current {
            VStack(alignment: .leading, spacing: 8) {
                Text("Lake Williamson weather")
                    .font(.headline)

                HStack(alignment: .firstTextBaseline) {
                    Text("\(Int(current.temp.rounded()))°")
                        .font(.system(size: 44, weight: .semibold, design: .rounded))
                        .foregroundStyle(BrandColors.lake)
                    VStack(alignment: .leading) {
                        Text(current.weather.first?.description.capitalized ?? "")
                            .font(.subheadline)
                        Text("Feels like \(Int(current.feels_like.rounded()))° · Wind \(Int(current.wind_speed)) mph")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(BrandColors.lakeLight.opacity(0.5), in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    @ViewBuilder
    private var announcementsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Announcements")
                .font(.headline)

            if repository.liveAnnouncements.isEmpty {
                Text("No active announcements right now.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
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

    private func statusCard(label: String, title: String, subtitle: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased())
                .font(.caption.weight(.bold))
                .foregroundStyle(tint)
            Text(title)
                .font(.title3.weight(.semibold))
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(tint.opacity(0.2), lineWidth: 1)
        )
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
