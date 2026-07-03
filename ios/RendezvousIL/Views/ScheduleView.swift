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
            .refreshable {
                await repository.loadScheduleBundle()
                await repository.loadScheduleExtras()
            }
            .overlay(alignment: .top) {
                if repository.isUsingOfflineSchedule {
                    offlineScheduleBanner
                }
            }
        }
    }

    private var offlineScheduleBanner: some View {
        Text(repository.scheduleSource == .bundled ? "Offline draft schedule" : "Cached schedule — pull to refresh")
            .font(.caption.weight(.medium))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(.ultraThinMaterial, in: Capsule())
            .padding(.top, 4)
    }

    @ViewBuilder
    private func scheduleContent(_ schedule: SchedulePayload) -> some View {
        VStack(spacing: 0) {
            if !repository.scheduleAnnouncements.isEmpty {
                announcementsBanner
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Array(schedule.days.enumerated()), id: \.offset) { index, day in
                        Button {
                            selectedDayIndex = index
                        } label: {
                            VStack(spacing: 4) {
                                Text(String(day.day.prefix(1)))
                                    .font(.headline.weight(.bold))
                                Text(day.day)
                                    .font(.caption2)
                            }
                            .frame(minWidth: 56, minHeight: 56)
                            .padding(.horizontal, 4)
                            .background(
                                selectedDayIndex == index ? BrandColors.lake : Color(.secondarySystemGroupedBackground),
                                in: RoundedRectangle(cornerRadius: 12)
                            )
                            .foregroundStyle(selectedDayIndex == index ? .white : .primary)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }
            .padding(.vertical, 8)

            if selectedDayIndex < schedule.days.count {
                let day = schedule.days[selectedDayIndex]
                let isoDate = schedule.dayDates[day.day] ?? ""

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        header(for: day, schedule: schedule)

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
                    .padding()
                }
            }
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
            Text("\(day.date) (\(day.day))")
                .font(.title2.weight(.semibold))
                .foregroundStyle(BrandColors.lake)
            Text(schedule.draftNotice)
                .font(.caption)
                .foregroundStyle(.secondary)
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
