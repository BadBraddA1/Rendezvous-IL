import Foundation
#if canImport(WidgetKit)
import WidgetKit
#endif

struct SchedulePayload: Codable, Sendable {
    let year: Int
    let dateRange: String
    let location: String
    let draftNotice: String
    let days: [ScheduleDay]
    let dayDates: [String: String]
    let luItems: [LUScheduleItem]
}

struct ScheduleDay: Codable, Identifiable, Sendable {
    var id: String { day }
    let day: String
    let date: String
    let color: String
    let events: [ScheduleEvent]
}

struct ScheduleEvent: Codable, Identifiable, Sendable {
    var id: String { "\(time)-\(title)" }
    let time: String
    let title: String
    let location: String?
    let note: String?
}

struct LUScheduleItem: Codable, Identifiable, Hashable, Sendable {
    var id: String { "\(date)-\(time)-\(title)" }
    let date: String
    let day: String
    let time: String
    let startHour: Int
    let startMinute: Int
    let endHour: Int?
    let endMinute: Int?
    let title: String
    let location: String?
    let isMeal: Bool?
}

struct NowNextResult: Sendable {
    let current: LUScheduleItem?
    let next: LUScheduleItem?
}

struct SharedScheduleSnapshot: Codable, Sendable {
    var eventYear: Int
    var dateRange: String
    var currentTitle: String?
    var currentTime: String?
    var currentLocation: String?
    var nextTitle: String?
    var nextTime: String?
    var nextLocation: String?
    var nextDay: String?
    var registrationOpens: String
    var luItems: [LUScheduleItem]
    var lastUpdated: Date
}

enum AppGroup {
    static let identifier = "group.com.rendezvousil.app"
}

enum SharedScheduleStore {
    private static let snapshotKey = "schedule_snapshot"

    static func save(_ snapshot: SharedScheduleSnapshot) {
        guard let defaults = UserDefaults(suiteName: AppGroup.identifier),
              let data = try? JSONEncoder().encode(snapshot)
        else { return }
        defaults.set(data, forKey: snapshotKey)
    }

    static func load() -> SharedScheduleSnapshot? {
        guard let defaults = UserDefaults(suiteName: AppGroup.identifier),
              let data = defaults.data(forKey: snapshotKey)
        else { return nil }
        return try? JSONDecoder().decode(SharedScheduleSnapshot.self, from: data)
    }

    static func publish(
        schedule: SchedulePayload?,
        nowNext: NowNextResult,
        registrationOpens: String = "January 1, 2027"
    ) {
        guard let schedule else { return }
        let snapshot = SharedScheduleSnapshot(
            eventYear: schedule.year,
            dateRange: schedule.dateRange,
            currentTitle: nowNext.current?.title,
            currentTime: nowNext.current?.time,
            currentLocation: nowNext.current?.location,
            nextTitle: nowNext.next?.title,
            nextTime: nowNext.next?.time,
            nextLocation: nowNext.next?.location,
            nextDay: nowNext.next?.day,
            registrationOpens: registrationOpens,
            luItems: schedule.luItems,
            lastUpdated: Date()
        )
        save(snapshot)
        #if canImport(WidgetKit)
        WidgetCenter.shared.reloadAllTimelines()
        #endif
    }
}

enum ScheduleNowNext {
    private static let chicago = TimeZone(identifier: "America/Chicago")!

    static func evaluate(items: [LUScheduleItem], now: Date = Date()) -> NowNextResult {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = chicago

        let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: now)
        guard let year = components.year,
              let month = components.month,
              let day = components.day,
              let hour = components.hour,
              let minute = components.minute
        else {
            return NowNextResult(current: nil, next: items.first)
        }

        let nowMinutes = hour * 60 + minute
        let todayISO = String(format: "%04d-%02d-%02d", year, month, day)

        var current: LUScheduleItem?
        var next: LUScheduleItem?

        for item in items {
            let start = item.startHour * 60 + item.startMinute
            let end: Int = {
                if let endHour = item.endHour, let endMinute = item.endMinute {
                    return endHour * 60 + endMinute
                }
                return start + 60
            }()

            guard item.date == todayISO else {
                if item.date > todayISO, next == nil {
                    next = item
                }
                continue
            }

            if nowMinutes >= start && nowMinutes < end {
                current = item
            } else if nowMinutes < start, next == nil {
                next = item
            }
        }

        if current == nil, next == nil, todayISO < "2027-05-03" {
            next = items.first
        }

        return NowNextResult(current: current, next: next)
    }

    /// Index into `schedule.days` for today during event week (Chicago), if any.
    static func todayDayIndex(in schedule: SchedulePayload, now: Date = Date()) -> Int? {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = chicago
        let components = calendar.dateComponents([.year, .month, .day], from: now)
        guard let year = components.year, let month = components.month, let day = components.day else {
            return nil
        }
        let todayISO = String(format: "%04d-%02d-%02d", year, month, day)
        for (index, scheduleDay) in schedule.days.enumerated() {
            if schedule.dayDates[scheduleDay.day] == todayISO {
                return index
            }
        }
        return nil
    }

    static func eventStartDate(for item: LUScheduleItem) -> Date? {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = chicago
        let parts = item.date.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        var components = DateComponents()
        components.year = parts[0]
        components.month = parts[1]
        components.day = parts[2]
        components.hour = item.startHour
        components.minute = item.startMinute
        components.second = 0
        return calendar.date(from: components)
    }
}

enum MealMatcher {
    static func mealType(for title: String) -> String? {
        let lower = title.lowercased()
        if lower.contains("breakfast") { return "breakfast" }
        if lower.contains("lunch") { return "lunch" }
        if lower.contains("dinner") || lower.contains("cookout") { return "dinner" }
        return nil
    }
}

enum AssemblyMatcher {
    static func timeSlot(for title: String, time: String) -> String? {
        let lower = title.lowercased()
        guard lower.contains("assembly") else { return nil }
        let upper = time.uppercased()
        if upper.contains("9:00") && upper.contains("AM") { return "Morning Devotion" }
        if upper.contains("7:00") && upper.contains("PM") { return "Evening Devotion" }
        if lower.contains("morning") { return "Morning Devotion" }
        if lower.contains("evening") { return "Evening Devotion" }
        return nil
    }
}

func matchingLUItem(event: ScheduleEvent, isoDate: String, items: [LUScheduleItem]) -> LUScheduleItem? {
    items.first { $0.date == isoDate && $0.title == event.title }
}
