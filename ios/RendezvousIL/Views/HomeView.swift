import Clerk
import SwiftUI

struct HomeView: View {
    @Environment(AppSession.self) private var session
    @Environment(RendezvousRepository.self) private var repository
    @Binding var selectedTab: AppTab

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    greetingCard
                    nowNextCard
                    hubGrid
                    retreatInfo
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Home")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await repository.loadUpdates()
            }
        }
    }

    private var greetingCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let name = session.userDisplayName {
                Text("Welcome, \(name)")
                    .font(.title2.weight(.semibold))
            } else {
                Text("Welcome back")
                    .font(.title2.weight(.semibold))
            }

            Text("Rendezvous \(AppConfig.eventYear) · \(AppConfig.eventDates)")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text(AppConfig.location)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(BrandColors.lakeLight, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(BrandColors.lake.opacity(0.2), lineWidth: 1)
        )
    }

    @ViewBuilder
    private var nowNextCard: some View {
        let result = repository.nowNext()

        if result.current != nil || result.next != nil {
            VStack(alignment: .leading, spacing: 12) {
                Text("During retreat")
                    .font(.headline)

                RetreatNowNextSection(result: result) {
                    selectedTab = .schedule
                }
            }
            .padding(16)
            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14))
        }
    }

    private var hubGrid: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Community")
                .font(.headline)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                HubTile(title: "Schedule", icon: "calendar", color: BrandColors.lake) {
                    selectedTab = .schedule
                }
                HubTile(title: "Updates", icon: "bell.badge", color: BrandColors.coral) {
                    selectedTab = .updates
                }
                HubTile(title: "Chat", icon: "bubble.left.and.bubble.right.fill", color: BrandColors.lake) {
                    selectedTab = .chat
                }
                NavigationLink {
                    DirectoryView()
                } label: {
                    HubTileLabel(title: "Directory", icon: "person.3.fill", color: BrandColors.coral)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var retreatInfo: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("This year")
                .font(.headline)

            infoRow(label: "Theme", value: AppConfig.theme, icon: "book.closed")
            infoRow(label: "Dates", value: AppConfig.eventDates, icon: "calendar")
            infoRow(label: "Place", value: "Lake Williamson, Carlinville, IL", icon: "mappin.and.ellipse")
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14))
    }

    private func infoRow(label: String, value: String, icon: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(BrandColors.lake)
                .frame(width: 22)
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text(value)
                    .font(.subheadline)
            }
        }
    }
}

private struct HubTile: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HubTileLabel(title: title, icon: icon, color: color)
        }
        .buttonStyle(.plain)
    }
}

private struct HubTileLabel: View {
    let title: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
            Text(title)
                .font(.caption.weight(.semibold))
        }
        .foregroundStyle(color)
        .frame(maxWidth: .infinity, minHeight: 88)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    HomeView(selectedTab: .constant(.home))
        .environment(RendezvousRepository())
        .environment(AppSession())
}
