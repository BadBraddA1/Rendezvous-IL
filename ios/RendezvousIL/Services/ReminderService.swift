import Foundation
import UserNotifications

@MainActor
final class ReminderService {
    static let shared = ReminderService()

    private let storageKey = "event.reminders"

    func preference(for eventId: String) -> EventReminderOffset? {
        load().first { $0.eventId == eventId }?.offset
    }

    func setReminder(for item: LUScheduleItem, offset: EventReminderOffset?) async {
        var prefs = load().filter { $0.eventId != item.id }
        if let offset {
            prefs.append(EventReminderPreference(eventId: item.id, offset: offset))
        }
        save(prefs)
        await rescheduleAll(items: nil)
    }

    func rescheduleAll(items: [LUScheduleItem]?) async {
        let center = UNUserNotificationCenter.current()
        let pending = await center.pendingNotificationRequests()
        let reminderIds = pending
            .map(\.identifier)
            .filter { $0.hasPrefix("rendezvous-reminder-") }
        center.removePendingNotificationRequests(withIdentifiers: reminderIds)

        let prefs = load()
        guard !prefs.isEmpty else { return }

        let luItems: [LUScheduleItem]
        if let items {
            luItems = items
        } else if let snapshot = SharedScheduleStore.load() {
            luItems = snapshot.luItems
        } else {
            return
        }

        let itemMap = Dictionary(uniqueKeysWithValues: luItems.map { ($0.id, $0) })

        for pref in prefs {
            guard let item = itemMap[pref.eventId],
                  let fireDate = ScheduleNowNext.eventStartDate(for: item)
            else { continue }

            let triggerDate = fireDate.addingTimeInterval(TimeInterval(-pref.offset.rawValue * 60))
            guard triggerDate > Date() else { continue }

            let content = UNMutableNotificationContent()
            content.title = pref.offset == .atStart ? item.title : "Up next: \(item.title)"
            content.body = [item.day, item.time, item.location]
                .compactMap { $0 }
                .joined(separator: " · ")
            content.sound = .default
            content.userInfo = ["url": "rendezvousil://schedule"]

            let components = Calendar.current.dateComponents(
                [.year, .month, .day, .hour, .minute],
                from: triggerDate
            )
            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            let request = UNNotificationRequest(
                identifier: "rendezvous-reminder-\(item.id)-\(pref.offset.rawValue)",
                content: content,
                trigger: trigger
            )
            try? await center.add(request)
        }
    }

    private func load() -> [EventReminderPreference] {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else { return [] }
        return (try? JSONDecoder().decode([EventReminderPreference].self, from: data)) ?? []
    }

    private func save(_ prefs: [EventReminderPreference]) {
        guard let data = try? JSONEncoder().encode(prefs) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }
}
