import Foundation
import UserNotifications

@MainActor
final class ReminderService {
    static let shared = ReminderService()

    private let storageKey = "event.reminders"

    func preference(for eventId: String) -> EventReminderOffset? {
        load().first { $0.eventId == eventId }?.offset
    }

    func setReminder(
        for item: LUScheduleItem,
        offset: EventReminderOffset?,
        allItems: [LUScheduleItem]? = nil
    ) async throws {
        var prefs = load().filter { $0.eventId != item.id }
        if let offset {
            prefs.append(EventReminderPreference(eventId: item.id, offset: offset, item: item))
        }
        save(prefs)
        try await rescheduleAll(items: allItems)
    }

    func rescheduleAll(items: [LUScheduleItem]?) async throws {
        let center = UNUserNotificationCenter.current()
        let pending = await center.pendingNotificationRequests()
        let reminderIds = pending
            .map(\.identifier)
            .filter { $0.hasPrefix("rendezvous-reminder-") }
        center.removePendingNotificationRequests(withIdentifiers: reminderIds)

        let prefs = load()
        guard !prefs.isEmpty else { return }

        var itemMap: [String: LUScheduleItem] = [:]
        if let items {
            for item in items { itemMap[item.id] = item }
        }
        if let snapshot = SharedScheduleStore.load() {
            for item in snapshot.luItems where itemMap[item.id] == nil {
                itemMap[item.id] = item
            }
        }
        // Embedded copies keep reminders schedulable even if the snapshot is empty.
        for pref in prefs {
            if itemMap[pref.eventId] == nil, let embedded = pref.item {
                itemMap[pref.eventId] = embedded
            }
        }

        var lastError: Error?
        for pref in prefs {
            guard let item = itemMap[pref.eventId],
                  let fireDate = ScheduleNowNext.eventStartDate(for: item)
            else { continue }

            let triggerDate = fireDate.addingTimeInterval(TimeInterval(-pref.offset.rawValue * 60))
            let interval = triggerDate.timeIntervalSinceNow
            guard interval > 1 else { continue }

            let content = UNMutableNotificationContent()
            content.title = pref.offset == .atStart ? item.title : "Up next: \(item.title)"
            content.body = [item.day, item.time, item.location]
                .compactMap { $0 }
                .joined(separator: " · ")
            content.sound = .default
            content.userInfo = ["url": "rendezvousil://schedule"]

            // Near-term: time-interval (absolute). Far-term: calendar components in the
            // user's local calendar derived from the absolute fire date.
            let trigger: UNNotificationTrigger
            if interval < 30 * 24 * 60 * 60 {
                trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
            } else {
                let components = Calendar.current.dateComponents(
                    [.year, .month, .day, .hour, .minute, .second],
                    from: triggerDate
                )
                trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            }
            let request = UNNotificationRequest(
                identifier: "rendezvous-reminder-\(item.id)-\(pref.offset.rawValue)",
                content: content,
                trigger: trigger
            )
            do {
                try await center.add(request)
            } catch {
                lastError = error
            }
        }

        if let lastError { throw lastError }
    }

    private func load() -> [EventReminderPreference] {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else { return [] }
        return (try? JSONDecoder().decode([EventReminderPreference].self, from: data)) ?? []
    }

    private func save(_ prefs: [EventReminderPreference]) {
        guard let data = try? JSONEncoder().encode(prefs) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }

    /// Number of events with a saved reminder preference.
    var savedReminderCount: Int {
        load().count
    }
}
