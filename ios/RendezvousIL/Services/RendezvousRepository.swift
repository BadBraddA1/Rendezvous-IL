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
    var scheduleError: String?

    private let weekFrom = "2027-05-03"
    private let weekTo = "2027-05-07"

    func loadScheduleBundle() async {
        isLoadingSchedule = true
        scheduleError = nil
        defer { isLoadingSchedule = false }

        do {
            schedule = try await APIClient.shared.get("/api/schedule")
            await syncSharedSnapshot()
            await ReminderService.shared.rescheduleAll(items: schedule?.luItems)
        } catch {
            if let bundled = loadBundledSchedule() {
                schedule = bundled
                scheduleError = nil
                await syncSharedSnapshot()
            } else {
                scheduleError = error.localizedDescription
            }
        }
    }

    func loadScheduleExtras() async {
        async let mealsTask: Void = fetchMeals()
        async let volunteerTask: Void = fetchVolunteers()
        async let scheduleAnnouncementsTask: Void = fetchScheduleAnnouncements()
        _ = await (mealsTask, volunteerTask, scheduleAnnouncementsTask)
    }

    func loadUpdates() async {
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
            rates = try await APIClient.shared.get("/api/rates?year=2027")
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

    private func fetchMeals() async {
        do {
            let response: MealsResponse = try await APIClient.shared.get("/api/meals")
            meals = response.meals ?? []
        } catch {
            meals = []
        }
    }

    private func fetchVolunteers() async {
        do {
            let response: VolunteerWeekResponse = try await APIClient.shared.get(
                "/api/volunteer-schedule?from=\(weekFrom)&to=\(weekTo)"
            )
            volunteerSchedules = response.schedules ?? [:]
        } catch {
            volunteerSchedules = [:]
        }
    }

    private func fetchLiveAnnouncements() async {
        do {
            let response: AnnouncementsResponse = try await APIClient.shared.get("/api/announcements")
            liveAnnouncements = response.announcements ?? []
        } catch {
            liveAnnouncements = []
        }
    }

    private func fetchScheduleAnnouncements() async {
        do {
            let response: ScheduleAnnouncementsResponse = try await APIClient.shared.get("/api/announcements/schedule")
            scheduleAnnouncements = response.announcements ?? []
        } catch {
            scheduleAnnouncements = []
        }
    }

    private func fetchWeather() async {
        do {
            weather = try await APIClient.shared.get("/api/weather")
        } catch {
            weather = nil
        }
    }

    private func loadBundledSchedule() -> SchedulePayload? {
        guard let url = Bundle.main.url(forResource: "schedule-fallback", withExtension: "json"),
              let data = try? Data(contentsOf: url)
        else { return nil }
        return try? JSONDecoder().decode(SchedulePayload.self, from: data)
    }
}
