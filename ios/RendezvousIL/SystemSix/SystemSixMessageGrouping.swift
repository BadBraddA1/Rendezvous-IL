import Foundation

struct SystemSixDayBlock<Message> {
    let dayKey: String
    let label: String
    var groups: [SystemSixMessageGroup<Message>]
}

struct SystemSixMessageGroup<Message> {
    let id: String
    let senderId: String
    var messages: [Message]
}

enum SystemSixMessageGrouping {
    static func dayKey(for date: Date, calendar: Calendar = .current) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    static func dayLabel(for date: Date, now: Date = Date(), calendar: Calendar = .current) -> String {
        let key = dayKey(for: date, calendar: calendar)
        if key == dayKey(for: now, calendar: calendar) { return "Today" }
        if let yesterday = calendar.date(byAdding: .day, value: -1, to: now),
           key == dayKey(for: yesterday, calendar: calendar) {
            return "Yesterday"
        }
        return date.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day())
    }

    static func formatExactTime(_ date: Date) -> String {
        date.formatted(date: .omitted, time: .shortened)
    }

    static func parseCreatedAt(_ raw: String) -> Date {
        if let d = ISO8601DateFormatter().date(from: raw) { return d }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: raw) { return d }
        return Date.distantPast
    }

    /// Same sender + under `window` → one group; day divider when the calendar day changes.
    static func group<Message>(
        _ messages: [Message],
        senderId: (Message) -> String,
        createdAt: (Message) -> Date,
        id: (Message) -> String,
        window: TimeInterval = SystemSixChatConfig.groupWindow
    ) -> [SystemSixDayBlock<Message>] {
        let sorted = messages.sorted { createdAt($0) < createdAt($1) }
        var days: [SystemSixDayBlock<Message>] = []
        var currentDayIndex: Int?
        var currentGroupIndex: Int?

        for message in sorted {
            let created = createdAt(message)
            let key = dayKey(for: created)
            let sid = senderId(message)

            if currentDayIndex == nil || days[currentDayIndex!].dayKey != key {
                days.append(SystemSixDayBlock(dayKey: key, label: dayLabel(for: created), groups: []))
                currentDayIndex = days.count - 1
                currentGroupIndex = nil
            }

            let dayIdx = currentDayIndex!
            let lastInGroup: Message? = {
                guard let gi = currentGroupIndex else { return nil }
                return days[dayIdx].groups[gi].messages.last
            }()

            let sameSender = {
                guard let gi = currentGroupIndex else { return false }
                return days[dayIdx].groups[gi].senderId == sid
            }()

            let withinWindow: Bool = {
                guard let lastInGroup else { return false }
                return created.timeIntervalSince(createdAt(lastInGroup)) <= window
            }()

            if let gi = currentGroupIndex, sameSender, withinWindow {
                days[dayIdx].groups[gi].messages.append(message)
            } else {
                days[dayIdx].groups.append(
                    SystemSixMessageGroup(
                        id: "\(sid)-\(id(message))",
                        senderId: sid,
                        messages: [message]
                    )
                )
                currentGroupIndex = days[dayIdx].groups.count - 1
            }
        }

        return days
    }
}
