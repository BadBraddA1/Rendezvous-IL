import Clerk
import SwiftUI

/// Live day board — now/next, weather, announcements, meal, chat, volunteering.
struct HomeView: View {
    @Environment(AppSession.self) private var session
    @Environment(RendezvousRepository.self) private var repository
    @Binding var selectedTab: AppTab

    @State private var volunteering: FamilyVolunteeringResponse?
    @State private var chatUnreadTotal = 0
    @State private var nextMealLine: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    headerCard
                    nowNextBlock
                    weatherBlock
                    announcementsBlock
                    nextMealBlock
                    chatBlock
                    volunteeringBlock
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Today")
            .navigationBarTitleDisplayMode(.large)
            .refreshable { await refreshBoard() }
            .task { await refreshBoard() }
        }
    }

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let name = session.userDisplayName {
                Text("Hi, \(name)")
                    .font(.title2.weight(.semibold))
            } else {
                Text("Today at Rendezvous")
                    .font(.title2.weight(.semibold))
            }
            Text("\(AppConfig.eventDates) · \(AppConfig.location)")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private var nowNextBlock: some View {
        let result = repository.nowNext()
        VStack(alignment: .leading, spacing: 12) {
            sectionTitle("Now & next")
            RetreatNowNextSection(result: result) {
                selectedTab = .schedule
            }
        }
    }

    @ViewBuilder
    private var weatherBlock: some View {
        if let current = repository.weather?.current {
            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("Weather")
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    Text("\(Int(current.temp.rounded()))°")
                        .font(.system(size: 36, weight: .semibold, design: .rounded))
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
            }
        }
    }

    @ViewBuilder
    private var announcementsBlock: some View {
        if !repository.liveAnnouncements.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                sectionTitle("Announcements")
                ForEach(repository.liveAnnouncements.prefix(3)) { item in
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

    @ViewBuilder
    private var nextMealBlock: some View {
        if let nextMealLine {
            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("Next meal")
                Button { selectedTab = .schedule } label: {
                    HStack {
                        Image(systemName: "fork.knife")
                            .foregroundStyle(BrandColors.coral)
                        Text(nextMealLine)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.primary)
                            .multilineTextAlignment(.leading)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.tertiary)
                    }
                    .padding()
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)
            }
        }
    }

    @ViewBuilder
    private var chatBlock: some View {
        Button { selectedTab = .chat } label: {
            HStack(spacing: 12) {
                Image(systemName: "bubble.left.and.bubble.right.fill")
                    .foregroundStyle(BrandColors.coral)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Chat")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                    Text(chatUnreadTotal > 0 ? "\(chatUnreadTotal) unread" : "Open year chat")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if chatUnreadTotal > 0 {
                    Text("\(chatUnreadTotal)")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(BrandColors.coral, in: Capsule())
                }
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding()
            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var volunteeringBlock: some View {
        if let volunteering, volunteering.hasContent == true {
            VStack(alignment: .leading, spacing: 12) {
                sectionTitle("Your volunteering")
                NavigationLink {
                    FamilyVolunteeringView()
                } label: {
                    VStack(alignment: .leading, spacing: 8) {
                        if volunteering.summary.pendingActionCount > 0 {
                            Label(
                                "\(volunteering.summary.pendingActionCount) action\(volunteering.summary.pendingActionCount == 1 ? "" : "s") needed",
                                systemImage: "exclamationmark.circle.fill"
                            )
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(BrandColors.coral)
                        }
                        if volunteering.summary.confirmedWorshipCount > 0 {
                            Text("\(volunteering.summary.confirmedWorshipCount) worship assignment\(volunteering.summary.confirmedWorshipCount == 1 ? "" : "s")")
                                .font(.subheadline)
                        }
                        if volunteering.summary.specialAssignmentCount > 0 {
                            Text("\(volunteering.summary.specialAssignmentCount) special job\(volunteering.summary.specialAssignmentCount == 1 ? "" : "s")")
                                .font(.subheadline)
                        }
                        if let first = volunteering.volunteers.first(where: { $0.worshipAssignment != nil }) {
                            Text("\(first.volunteerName) · \(first.worshipAssignment?.roleLabel ?? first.volunteerType)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Text("View details")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(BrandColors.lake)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func sectionTitle(_ text: String) -> some View {
        Text(text)
            .font(.headline)
    }

    private func refreshBoard() async {
        async let updates: Void = repository.loadUpdates()
        async let schedule: Void = {
            if repository.schedule == nil {
                await repository.loadScheduleBundle()
            }
            await repository.loadScheduleExtras()
        }()
        async let volunteeringTask: Void = loadVolunteering()
        async let chatTask: Void = loadChatUnread()
        _ = await (updates, schedule(), volunteeringTask, chatTask)
        nextMealLine = computeNextMealLine()
    }

    private func loadVolunteering() async {
        guard let client = session.apiClient else {
            volunteering = nil
            await VolunteerReminderService.sync(from: nil)
            return
        }
        let payload = try? await client.getFamilyVolunteering()
        volunteering = payload
        await VolunteerReminderService.sync(from: payload)
    }

    private func loadChatUnread() async {
        guard let client = session.apiClient else {
            chatUnreadTotal = 0
            return
        }
        do {
            let response = try await client.getChatChannels()
            chatUnreadTotal = response.channels.reduce(0) { $0 + max(0, $1.unread_count ?? 0) }
        } catch {
            // Keep last known count on soft failure.
        }
    }

    private func computeNextMealLine() -> String? {
        let result = repository.nowNext()
        let items = repository.schedule?.luItems ?? []
        let candidates: [LUScheduleItem] = {
            if let current = result.current, current.isMeal == true { return [current] }
            if let next = result.next, next.isMeal == true { return [next] }
            let today = ScheduleNowNext.chicagoISODate()
            return items.filter { $0.isMeal == true && $0.date >= today }
        }()
        guard let mealEvent = candidates.first else { return nil }
        if let meal = repository.meal(date: mealEvent.date, mealType: MealMatcher.mealType(for: mealEvent.title) ?? "") {
            let dish = meal.main_dish.trimmingCharacters(in: .whitespacesAndNewlines)
            let label = dish.isEmpty ? mealEvent.title : "\(mealEvent.title): \(dish)"
            return [mealEvent.day, mealEvent.time, label].joined(separator: " · ")
        }
        return [mealEvent.day, mealEvent.time, mealEvent.title].joined(separator: " · ")
    }
}

#Preview {
    HomeView(selectedTab: .constant(.home))
        .environment(RendezvousRepository())
        .environment(AppSession())
}
