import SwiftUI

struct ScheduleView: View {
    @Environment(RendezvousRepository.self) private var repository
    @State private var selectedDayIndex = 0

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
                if repository.isRefreshingSchedule {
                    ToolbarItem(placement: .topBarTrailing) {
                        ProgressView()
                    }
                }
            }
            .refreshable {
                await repository.loadScheduleBundle()
                await repository.loadScheduleExtras()
            }
            .onChange(of: repository.schedule?.year) { _, _ in
                syncSelectedDay()
            }
            .onAppear {
                syncSelectedDay()
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

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        header(for: day, schedule: schedule)

                        if day.events.isEmpty {
                            Text("No events listed for this day.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 24)
                        } else {
                            ForEach(day.events) { event in
                                EventCard(
                                    event: event,
                                    isoDate: isoDate,
                                    luItem: matchingLUItem(event: event, isoDate: isoDate, items: schedule.luItems),
                                    meal: mealFor(event: event, isoDate: isoDate),
                                    volunteers: volunteersFor(event: event, isoDate: isoDate)
                                )
                            }
                        }
                    }
                    .padding()
                }
            }
        }
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

    private func dayPicker(_ schedule: SchedulePayload) -> some View {
        VStack(spacing: 8) {
            if ScheduleNowNext.todayDayIndex(in: schedule) != nil {
                HStack {
                    Spacer()
                    Button("Today") {
                        if let index = ScheduleNowNext.todayDayIndex(in: schedule) {
                            selectedDayIndex = index
                        }
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

    private func syncSelectedDay() {
        guard let schedule = repository.schedule else { return }
        if let today = ScheduleNowNext.todayDayIndex(in: schedule) {
            selectedDayIndex = today
        } else {
            selectedDayIndex = min(selectedDayIndex, max(0, schedule.days.count - 1))
        }
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
    let meal: Meal?
    let volunteers: VolunteerScheduleSlot?

    @State private var showReminderSheet = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
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
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
        .sheet(isPresented: $showReminderSheet) {
            if let luItem {
                EventReminderSheet(item: luItem)
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
            Label(location, systemImage: "mappin.and.ellipse")
                .font(.subheadline)
                .foregroundStyle(.secondary)
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
