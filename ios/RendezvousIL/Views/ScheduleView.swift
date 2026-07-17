import SwiftUI

struct ScheduleView: View {
    @Environment(RendezvousRepository.self) private var repository
    @State private var selectedDayIndex = 0
    @State private var scrollToEventId: String?
    @State private var highlightedEventId: String?
    /// Only auto-position once per schedule payload load.
    @State private var didAutoPosition = false

    var body: some View {
        NavigationStack {
            Group {
                if repository.isLoadingSchedule && repository.schedule == nil {
                    ProgressView("Loading schedule…")
                } else if let schedule = repository.schedule {
                    scheduleContent(schedule)
                } else {
                    ContentUnavailableView(
                        "Schedule unavailable",
                        systemImage: "calendar.badge.exclamationmark",
                        description: Text(repository.scheduleError ?? "Pull to retry.")
                    )
                }
            }
            .navigationTitle("Schedule")
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    if repository.isRefreshingSchedule || repository.isLoadingUpdates {
                        ProgressView()
                    }
                    if let schedule = repository.schedule, jumpTarget(in: schedule) != nil {
                        Button("Jump to now") {
                            jumpToNowNext(in: schedule, userInitiated: true)
                        }
                        .font(.subheadline.weight(.semibold))
                    }
                }
            }
            .refreshable {
                await repository.loadScheduleBundle()
                await repository.loadScheduleExtras()
                await repository.loadUpdates()
            }
            .task {
                await repository.loadUpdates()
            }
            .onChange(of: repository.schedule?.year) { _, _ in
                didAutoPosition = false
                syncSelectedDay(autoScrollToNow: true)
            }
            .onChange(of: repository.schedule?.days.count) { _, _ in
                syncSelectedDay(autoScrollToNow: !didAutoPosition)
            }
            .onAppear {
                syncSelectedDay(autoScrollToNow: !didAutoPosition)
            }
        }
    }

    @ViewBuilder
    private func scheduleContent(_ schedule: SchedulePayload) -> some View {
        VStack(spacing: 0) {
            if repository.isUsingOfflineSchedule {
                offlineScheduleBanner
            }

            if !repository.scheduleAnnouncements.isEmpty {
                announcementsBanner
            }

            dayPicker(schedule)

            if selectedDayIndex < schedule.days.count {
                let day = schedule.days[selectedDayIndex]
                let isoDate = schedule.dayDates[day.day] ?? ""

                ScrollViewReader { proxy in
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            liveUpdatesSection
                                .id("schedule-top")

                            header(for: day, schedule: schedule)

                            if day.events.isEmpty {
                                Text("No events listed for this day.")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 24)
                            } else {
                                ForEach(day.events) { event in
                                    let eventId = eventScrollId(isoDate: isoDate, event: event)
                                    EventCard(
                                        event: event,
                                        isoDate: isoDate,
                                        luItem: matchingLUItem(event: event, isoDate: isoDate, items: schedule.luItems),
                                        allLuItems: schedule.luItems,
                                        meal: mealFor(event: event, isoDate: isoDate),
                                        volunteers: volunteersFor(event: event, isoDate: isoDate),
                                        isHappeningNow: eventId == highlightedEventId
                                    )
                                    .id(eventId)
                                }
                            }
                        }
                        .padding()
                    }
                    .task(id: scrollToEventId) {
                        guard let eventId = scrollToEventId else { return }
                        // Wait for the selected day’s cards to mount after a day switch.
                        try? await Task.sleep(nanoseconds: 150_000_000)
                        withAnimation(.easeInOut(duration: 0.35)) {
                            proxy.scrollTo(eventId, anchor: .top)
                        }
                        scrollToEventId = nil
                    }
                }
            }
        }
    }

    private func eventScrollId(isoDate: String, event: ScheduleEvent) -> String {
        "\(isoDate)|\(event.time)|\(event.title)"
    }

    /// Prefer the event happening now; otherwise the next upcoming event.
    private func jumpTarget(in schedule: SchedulePayload) -> (dayIndex: Int, eventId: String)? {
        let result = repository.nowNext()
        // Always prefer the in-progress event when Jump to now / auto-position runs.
        guard let item = result.current ?? result.next else { return nil }

        for (index, day) in schedule.days.enumerated() {
            let isoDate = ScheduleNowNext.isoDate(for: day, in: schedule) ?? ""
            guard isoDate == item.date else { continue }
            if let event = day.events.first(where: { $0.title == item.title && $0.time == item.time })
                ?? day.events.first(where: { $0.title == item.title }) {
                return (index, eventScrollId(isoDate: isoDate, event: event))
            }
            // LU-only items (e.g. Good Night) — land on the day header area.
            return (index, "schedule-top")
        }
        return nil
    }

    private func jumpToNowNext(in schedule: SchedulePayload, userInitiated: Bool) {
        guard let target = jumpTarget(in: schedule) else { return }
        selectedDayIndex = target.dayIndex
        highlightedEventId = target.eventId == "schedule-top" ? nil : target.eventId
        scrollToEventId = target.eventId
        if userInitiated { didAutoPosition = true }
    }

    private var offlineScheduleBanner: some View {
        HStack {
            Image(systemName: "wifi.slash")
            Text(repository.scheduleSource == .bundled ? "Offline draft schedule" : "Cached schedule — pull to refresh")
        }
        .font(.caption.weight(.medium))
        .foregroundStyle(.secondary)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(BrandColors.warmSurface)
    }

    /// Live updates (now/next, weather, announcements) live on Schedule so one tab covers the day.
    private var liveUpdatesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 12) {
                Text("Now & next")
                    .font(.headline)
                RetreatNowNextSection(
                    result: repository.nowNext(),
                    emptyMessage: "Live now/next appears during retreat week (Central Time)."
                )
            }

            weatherBlock
            liveAnnouncementsBlock
        }
    }

    @ViewBuilder
    private var weatherBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Weather")
                .font(.headline)
            if let current = repository.weather?.current {
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
    private var liveAnnouncementsBlock: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Announcements")
                .font(.headline)
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

    private func dayPicker(_ schedule: SchedulePayload) -> some View {
        VStack(spacing: 8) {
            if ScheduleNowNext.todayDayIndex(in: schedule) != nil {
                HStack {
                    Spacer()
                    Button("Today") {
                        jumpToNowNext(in: schedule, userInitiated: true)
                    }
                    .font(.caption.weight(.semibold))
                    .buttonStyle(.bordered)
                    .tint(BrandColors.lake)
                }
                .padding(.horizontal)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Array(schedule.days.enumerated()), id: \.offset) { index, day in
                        Button {
                            selectedDayIndex = index
                        } label: {
                            VStack(spacing: 4) {
                                Text(String(day.day.prefix(3)))
                                    .font(.caption.weight(.bold))
                                Text(day.date)
                                    .font(.caption2)
                                    .lineLimit(1)
                            }
                            .frame(minWidth: 64, minHeight: 56)
                            .padding(.horizontal, 6)
                            .background(
                                selectedDayIndex == index ? BrandColors.lake : Color(.secondarySystemGroupedBackground),
                                in: RoundedRectangle(cornerRadius: 12)
                            )
                            .foregroundStyle(selectedDayIndex == index ? .white : .primary)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("\(day.day), \(day.date)")
                    }
                }
                .padding(.horizontal)
            }
        }
        .padding(.vertical, 8)
    }

    private func syncSelectedDay(autoScrollToNow: Bool) {
        guard let schedule = repository.schedule, !schedule.days.isEmpty else { return }
        if didAutoPosition {
            selectedDayIndex = min(selectedDayIndex, schedule.days.count - 1)
            return
        }
        selectedDayIndex = ScheduleNowNext.preferredDayIndex(in: schedule)
        didAutoPosition = true
        guard autoScrollToNow else { return }
        // Scroll to the in-progress (or next) event once the day list is ready.
        jumpToNowNext(in: schedule, userInitiated: false)
    }

    private var announcementsBanner: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(repository.scheduleAnnouncements) { item in
                    Text(item.title)
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(BrandColors.warmSurface, in: Capsule())
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 8)
        .background(BrandColors.lakeLight.opacity(0.5))
    }

    private func header(for day: ScheduleDay, schedule: SchedulePayload) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("\(day.date) · \(day.day)")
                .font(.title2.weight(.semibold))
                .foregroundStyle(BrandColors.lake)
            Text(schedule.dateRange)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            if !schedule.draftNotice.isEmpty {
                Text(schedule.draftNotice)
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func mealFor(event: ScheduleEvent, isoDate: String) -> Meal? {
        guard let mealType = MealMatcher.mealType(for: event.title) else { return nil }
        return repository.meal(date: isoDate, mealType: mealType)
    }

    private func volunteersFor(event: ScheduleEvent, isoDate: String) -> VolunteerScheduleSlot? {
        guard let slot = AssemblyMatcher.timeSlot(for: event.title, time: event.time) else { return nil }
        return repository.volunteers(date: isoDate, timeSlot: slot)
    }
}

private struct EventCard: View {
    let event: ScheduleEvent
    let isoDate: String
    let luItem: LUScheduleItem?
    let allLuItems: [LUScheduleItem]
    let meal: Meal?
    let volunteers: VolunteerScheduleSlot?
    var isHappeningNow: Bool = false

    @State private var showReminderSheet = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if isHappeningNow {
                Text("Happening now")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(BrandColors.coralInk)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(BrandColors.coral.opacity(0.2), in: Capsule())
            }
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 10) {
                    eventBody
                }
                if luItem != nil {
                    Spacer(minLength: 8)
                    Button {
                        showReminderSheet = true
                    } label: {
                        Image(systemName: reminderIcon)
                            .font(.title3)
                            .foregroundStyle(BrandColors.coral)
                            .frame(width: 44, height: 44)
                    }
                    .accessibilityLabel("Set reminder")
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.secondarySystemGroupedBackground))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isHappeningNow ? BrandColors.lake : Color.clear, lineWidth: 2)
                )
        )
        .sheet(isPresented: $showReminderSheet) {
            if let luItem {
                EventReminderSheet(item: luItem, allItems: allLuItems)
            }
        }
    }

    @ViewBuilder
    private var eventBody: some View {
        Text(event.time)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(BrandColors.lake)

        Text(event.title)
            .font(.body.weight(.medium))

        if let location = event.location {
            Button {
                if let pin = VenueMapStore.pin(matchingLocationText: location) {
                    DeepLinkRouter.open(URL(string: "rendezvousil://map?pin=\(pin.id)")!)
                } else {
                    DeepLinkRouter.open(URL(string: "rendezvousil://map")!)
                }
            } label: {
                Label(location, systemImage: "mappin.and.ellipse")
                    .font(.subheadline)
                    .foregroundStyle(BrandColors.lake)
            }
            .buttonStyle(.plain)
            .accessibilityHint("Opens campus map")
        }

        if let note = event.note {
            Text(note)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }

        if let meal {
            MealDetailView(meal: meal)
        }

        if let volunteers {
            VolunteerDetailView(slot: volunteers)
        }
    }

    private var reminderIcon: String {
        if let luItem, ReminderService.shared.preference(for: luItem.id) != nil {
            return "bell.fill"
        }
        return "bell"
    }
}

struct MealDetailView: View {
    let meal: Meal

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Menu")
                .font(.caption.weight(.semibold))
                .foregroundStyle(BrandColors.coralInk)
            Text(meal.main_dish)
                .font(.subheadline)
            if let sides = meal.sides, !sides.isEmpty {
                Text(sides.joined(separator: ", "))
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            if let dessert = meal.dessert, !dessert.isEmpty {
                Text("Dessert: \(dessert)")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(10)
        .background(BrandColors.lakeLight.opacity(0.6), in: RoundedRectangle(cornerRadius: 8))
    }
}

struct VolunteerDetailView: View {
    let slot: VolunteerScheduleSlot

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Worship leaders")
                .font(.caption.weight(.semibold))
                .foregroundStyle(BrandColors.lake)
            if let name = slot.openingPrayer {
                row("Opening prayer", name)
            }
            if let name = slot.leadingSingingA {
                row("Singing A", name)
            }
            if let name = slot.leadingSingingB {
                row("Singing B", name)
            }
            if let name = slot.readingScriptureA {
                row("Scripture A", name)
            }
            if let name = slot.presentingLessonA, let title = slot.lessonTitleA {
                row("Lesson A", "\(name) — \(title)")
            }
            if let name = slot.closingPrayer {
                row("Closing prayer", name)
            }
        }
        .padding(10)
        .background(BrandColors.warmSurface, in: RoundedRectangle(cornerRadius: 8))
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack(alignment: .top) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(width: 100, alignment: .leading)
            Text(value)
                .font(.caption)
        }
    }
}

#Preview {
    ScheduleView()
        .environment(RendezvousRepository())
}
