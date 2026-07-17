import Foundation

@MainActor
@Observable
final class RendezvousRepository {
    var schedule: SchedulePayload?
    var meals: [Meal] = []
    var volunteerSchedules: [String: VolunteerScheduleSlot] = [:]
    var liveAnnouncements: [Announcement] = []
    var scheduleAnnouncements: [Announcement] = []
    var weather: WeatherPayload?
    var rates: RatesPayload?

    var isLoadingSchedule = false
    var isRefreshingSchedule = false
    var isLoadingUpdates = false
    var scheduleError: String?
    var scheduleSource: ScheduleDataSource?
    var lastScheduleRefresh: Date?

    /// True when showing bundled or cached schedule instead of a fresh network copy.
    var isUsingOfflineSchedule: Bool {
        guard schedule != nil else { return false }
        return scheduleSource != .network
    }

    private let weekFrom = "2027-05-03"
    private let weekTo = "2027-05-07"

    init() {
        applyOfflineScheduleIfNeeded()
    }

    /// Offline-first bootstrap — call once after sign-in.
    func bootstrap() async {
        applyOfflineScheduleIfNeeded()
        if AppStoreScreenshotMode.isEnabled {
            // Demo mode: bundled schedule only — no network (faster, deterministic frames).
            return
        }
        async let scheduleTask: Void = loadScheduleBundle()
        async let extrasTask: Void = loadScheduleExtras()
        async let updatesTask: Void = loadUpdates()
        _ = await (scheduleTask, extrasTask, updatesTask)
    }

    func loadScheduleBundle() async {
        applyOfflineScheduleIfNeeded()

        if schedule == nil {
            isLoadingSchedule = true
        } else {
            isRefreshingSchedule = true
        }
        scheduleError = nil
        defer {
            isLoadingSchedule = false
            isRefreshingSchedule = false
        }

        do {
            let payload: SchedulePayload = try await RepositoryFetch.withTimeout {
                try await APIClient.shared.get("/api/schedule")
            }
            schedule = payload
            scheduleSource = .network
            lastScheduleRefresh = Date()
            ScheduleDataStore.saveCached(payload)
            await syncSharedSnapshot()
            try? await ReminderService.shared.rescheduleAll(items: payload.luItems)
        } catch {
            if schedule == nil, let offline = ScheduleDataStore.bestOfflineSchedule() {
                schedule = offline.schedule
                scheduleSource = offline.source
                await syncSharedSnapshot()
            } else if schedule == nil {
                scheduleError = "Could not load schedule. Pull to retry."
            }
            #if DEBUG
            AppLog.bootstrap("schedule fetch failed: \(error.localizedDescription)")
            #endif
        }
    }

    func loadScheduleExtras() async {
        async let mealsTask: Void = fetchMeals()
        async let volunteerTask: Void = fetchVolunteers()
        async let scheduleAnnouncementsTask: Void = fetchScheduleAnnouncements()
        _ = await (mealsTask, volunteerTask, scheduleAnnouncementsTask)
    }

    func loadUpdates() async {
        let showLoading = liveAnnouncements.isEmpty && weather == nil
        if showLoading { isLoadingUpdates = true }
        defer { isLoadingUpdates = false }

        async let announcementsTask: Void = fetchLiveAnnouncements()
        async let weatherTask: Void = fetchWeather()
        _ = await (announcementsTask, weatherTask)
        if schedule == nil {
            await loadScheduleBundle()
        } else {
            await syncSharedSnapshot()
        }
    }

    func loadRates() async {
        do {
            rates = try await RepositoryFetch.withTimeout {
                try await APIClient.shared.get("/api/rates?year=2027")
            }
        } catch {
            rates = nil
        }
    }

    func meal(date: String, mealType: String) -> Meal? {
        meals.first { $0.date == date && $0.meal_type == mealType }
    }

    func volunteers(date: String, timeSlot: String) -> VolunteerScheduleSlot? {
        volunteerSchedules["\(date)|\(timeSlot)"]
    }

    func nowNext() -> NowNextResult {
        guard let items = schedule?.luItems else {
            return NowNextResult(current: nil, next: nil)
        }
        return ScheduleNowNext.evaluate(items: items)
    }

    func syncSharedSnapshot() async {
        let result = nowNext()
        SharedScheduleStore.publish(schedule: schedule, nowNext: result)
        guard NotificationService.shared.liveActivityEnabled else { return }
        Task(priority: .utility) {
            await LiveActivityManager.shared.refresh(schedule: schedule, nowNext: result)
        }
    }

    private func applyOfflineScheduleIfNeeded() {
        guard schedule == nil else { return }
        guard let offline = ScheduleDataStore.bestOfflineSchedule() else { return }
        schedule = offline.schedule
        scheduleSource = offline.source
        SharedScheduleStore.publish(schedule: schedule, nowNext: nowNext())
    }

    private func fetchMeals() async {
        do {
            let response: MealsResponse = try await RepositoryFetch.withTimeout {
                try await APIClient.shared.get("/api/meals")
            }
            meals = response.meals ?? []
        } catch {
            meals = []
        }
    }

    private func fetchVolunteers() async {
        let from = weekFrom
        let to = weekTo
        do {
            let response: VolunteerWeekResponse = try await RepositoryFetch.withTimeout {
                try await APIClient.shared.get(
                    "/api/volunteer-schedule?from=\(from)&to=\(to)"
                )
            }
            volunteerSchedules = response.schedules ?? [:]
        } catch {
            volunteerSchedules = [:]
        }
    }

    private func fetchLiveAnnouncements() async {
        do {
            let response: AnnouncementsResponse = try await RepositoryFetch.withTimeout {
                try await APIClient.shared.get("/api/announcements")
            }
            liveAnnouncements = response.announcements ?? []
        } catch {
            liveAnnouncements = []
        }
    }

    private func fetchScheduleAnnouncements() async {
        do {
            let response: ScheduleAnnouncementsResponse = try await RepositoryFetch.withTimeout {
                try await APIClient.shared.get("/api/announcements/schedule")
            }
            scheduleAnnouncements = response.announcements ?? []
        } catch {
            scheduleAnnouncements = []
        }
    }

    private func fetchWeather() async {
        do {
            weather = try await RepositoryFetch.withTimeout {
                try await APIClient.shared.get("/api/weather")
            }
        } catch {
            weather = nil
        }
    }
}
