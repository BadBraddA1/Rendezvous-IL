import Foundation
import UserNotifications

/// Auto-schedules a local notification 30 minutes before each volunteering start.
@MainActor
enum VolunteerReminderService {
    private static let idPrefix = "rendezvous-volunteer-"
    private static let minutesBefore = 30

    static func sync(from payload: FamilyVolunteeringResponse?) async {
        let center = UNUserNotificationCenter.current()
        let pending = await center.pendingNotificationRequests()
        let stale = pending.map(\.identifier).filter { $0.hasPrefix(idPrefix) }
        center.removePendingNotificationRequests(withIdentifiers: stale)

        guard let payload else { return }

        struct Slot {
            let id: String
            let title: String
            let body: String
            let startsAt: String
        }

        var slots: [Slot] = []
        for volunteer in payload.volunteers {
            guard let worship = volunteer.worshipAssignment,
                  let startsAt = worship.startsAt, !startsAt.isEmpty
            else { continue }
            slots.append(
                Slot(
                    id: "worship-\(volunteer.id)",
                    title: "Volunteering in \(minutesBefore)m",
                    body: "\(volunteer.volunteerName) · \(worship.roleLabel)",
                    startsAt: startsAt
                )
            )
        }
        for item in payload.specialAssignments {
            guard let startsAt = item.startsAt, !startsAt.isEmpty else { continue }
            slots.append(
                Slot(
                    id: "special-\(item.id)",
                    title: "Volunteering in \(minutesBefore)m",
                    body: "\(item.matchedName) · \(item.activityName)",
                    startsAt: startsAt
                )
            )
        }

        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let isoNoFraction = ISO8601DateFormatter()
        isoNoFraction.formatOptions = [.withInternetDateTime]

        for slot in slots {
            let start =
                iso.date(from: slot.startsAt)
                ?? isoNoFraction.date(from: slot.startsAt)
            guard let start else { continue }
            let fire = start.addingTimeInterval(TimeInterval(-minutesBefore * 60))
            let interval = fire.timeIntervalSinceNow
            guard interval > 1 else { continue }

            let content = UNMutableNotificationContent()
            content.title = slot.title
            content.body = slot.body
            content.sound = .default
            content.userInfo = ["url": "rendezvousil://home"]

            let trigger: UNNotificationTrigger
            if interval < 30 * 24 * 60 * 60 {
                trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
            } else {
                let components = Calendar.current.dateComponents(
                    [.year, .month, .day, .hour, .minute, .second],
                    from: fire
                )
                trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            }

            let request = UNNotificationRequest(
                identifier: "\(idPrefix)\(slot.id)",
                content: content,
                trigger: trigger
            )
            try? await center.add(request)
        }
    }
}
