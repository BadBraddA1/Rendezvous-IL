import Clerk
import SwiftUI

/// Live day board — sections ordered remotely via Admin → Home board.
struct HomeView: View {
    @Environment(AppSession.self) private var session
    @Environment(RendezvousRepository.self) private var repository
    @Binding var selectedTab: AppTab

    @State private var board: HomeBoardConfig?
    @State private var checkIn: FamilyCheckInResponse?
    @State private var volunteering: FamilyVolunteeringResponse?
    @State private var chatUnreadTotal = 0
    @State private var nextMealLine: String?

    private var sections: [HomeBoardSection] {
        if let board {
            return board.sections.filter(\.enabled)
        }
        // Offline / first paint defaults match server defaults.
        return [
            "header", "check_in", "now_next", "weather",
            "announcements", "next_meal", "chat", "volunteering",
        ].map { HomeBoardSection(id: $0, type: $0, enabled: true, title: nil, body: nil, linkUrl: nil, linkLabel: nil) }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    ForEach(sections) { section in
                        sectionView(section)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Today")
            .navigationBarTitleDisplayMode(.large)
            .refreshable { await refreshBoard() }
            .task {
                if let cached = HomeBoardDataStore.load(year: AppConfig.eventYear) {
                    board = cached
                }
                await refreshBoard()
            }
        }
    }

    @ViewBuilder
    private func sectionView(_ section: HomeBoardSection) -> some View {
        switch section.type {
        case "header":
            headerCard
        case "check_in":
            checkInBlock
        case "now_next":
            nowNextBlock
        case "weather":
            weatherBlock
        case "announcements":
            announcementsBlock
        case "next_meal":
            nextMealBlock
        case "chat":
            chatBlock
        case "volunteering":
            volunteeringBlock
        case "banner":
            bannerBlock(section)
        default:
            EmptyView()
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
    private var checkInBlock: some View {
        if let checkIn {
            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("Check-in")
                VStack(alignment: .leading, spacing: 6) {
                    if !checkIn.hasRegistration {
                        Text("No registration linked for \(checkIn.eventYear)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    } else if checkIn.checkedIn {
                        Label("Checked in", systemImage: "checkmark.circle.fill")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(BrandColors.lake)
                        if let lodging = checkIn.lodgingLabel {
                            Text(lodging)
                                .font(.subheadline)
                        }
                        if !checkIn.roomKeys.isEmpty {
                            Text("Room keys: \(checkIn.roomKeys.joined(separator: ", "))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        if let at = checkIn.checkedInAt, !at.isEmpty {
                            Text(formatCheckInTime(at))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        Text("Not checked in yet")
                            .font(.subheadline.weight(.semibold))
                        if let lodging = checkIn.lodgingLabel {
                            Text(lodging)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    @ViewBuilder
    private func bannerBlock(_ section: HomeBoardSection) -> some View {
        let title = section.title?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let body = section.body?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !title.isEmpty || !body.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                if !title.isEmpty {
                    Text(title)
                        .font(.headline)
                }
                if !body.isEmpty {
                    Text(body)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                if let urlString = section.linkUrl,
                   let url = URL(string: urlString),
                   !urlString.isEmpty {
                    Link(section.linkLabel?.isEmpty == false ? section.linkLabel! : "Learn more", destination: url)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(BrandColors.lake)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(BrandColors.lakeLight.opacity(0.45), in: RoundedRectangle(cornerRadius: 12))
        }
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

    private func formatCheckInTime(_ value: String) -> String {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = iso.date(from: value)
            ?? ISO8601DateFormatter().date(from: value)
        guard let date else { return "Checked in \(value)" }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return "Checked in \(formatter.string(from: date))"
    }

    private func refreshBoard() async {
        async let updates: Void = repository.loadUpdates()
        async let scheduleLoad: Void = loadScheduleForBoard()
        async let boardTask: Void = loadHomeBoard()
        async let checkInTask: Void = loadCheckIn()
        async let volunteeringTask: Void = loadVolunteering()
        async let chatTask: Void = loadChatUnread()
        _ = await (updates, scheduleLoad, boardTask, checkInTask, volunteeringTask, chatTask)
        nextMealLine = computeNextMealLine()
    }

    private func loadHomeBoard() async {
        guard let client = session.apiClient else { return }
        if let config = try? await client.getHomeBoard() {
            board = config
            HomeBoardDataStore.save(config, year: config.eventYear)
        }
    }

    private func loadCheckIn() async {
        guard let client = session.apiClient else {
            checkIn = nil
            return
        }
        checkIn = try? await client.getFamilyCheckIn()
    }

    private func loadScheduleForBoard() async {
        if repository.schedule == nil {
            await repository.loadScheduleBundle()
        }
        await repository.loadScheduleExtras()
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
        .environment(AppSession())
        .environment(RendezvousRepository())
}
