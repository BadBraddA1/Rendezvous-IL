import ActivityKit
import Foundation

@MainActor
final class LiveActivityManager {
    static let shared = LiveActivityManager()

    /// Only surface Live Activities within this window of an item's start (or while it is current).
    private static let leadTime: TimeInterval = 12 * 60 * 60

    private var updateTask: Task<Void, Never>?

    func refresh(schedule: SchedulePayload? = nil, nowNext: NowNextResult? = nil) async {
        guard NotificationService.shared.liveActivityEnabled else {
            await endAll()
            return
        }

        let snapshot = SharedScheduleStore.load()
        let items = schedule?.luItems ?? snapshot?.luItems ?? []
        let result = nowNext ?? ScheduleNowNext.evaluate(items: items)

        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

        guard let presentation = presentation(for: result, now: Date()) else {
            await endAll()
            return
        }

        let state = presentation.state
        let yearLabel = String(schedule?.year ?? snapshot?.eventYear ?? AppConfig.eventYear)
        let dateRange = schedule?.dateRange ?? snapshot?.dateRange ?? AppConfig.eventDates

        if let activity = Activity<RendezvousActivityAttributes>.activities.first {
            await activity.update(ActivityContent(state: state, staleDate: Date().addingTimeInterval(90)))
            observeActivityPushToken(activity)
        } else {
            let attributes = RendezvousActivityAttributes(
                eventYearLabel: yearLabel,
                dateRange: dateRange
            )
            let content = ActivityContent(state: state, staleDate: Date().addingTimeInterval(90))
            if let activity = try? Activity.request(attributes: attributes, content: content) {
                observeActivityPushToken(activity)
                startPeriodicUpdates()
            }
        }
    }

    func endAll() async {
        updateTask?.cancel()
        updateTask = nil
        for activity in Activity<RendezvousActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }

    /// Build Live Activity content only when an item is happening now, or starts within 12 hours.
    private func presentation(for result: NowNextResult, now: Date) -> (state: RendezvousActivityAttributes.ContentState, featuredStart: Date)? {
        if let current = result.current,
           let start = ScheduleNowNext.eventStartDate(for: current) {
            let end = ScheduleNowNext.eventEndDate(for: current) ?? start.addingTimeInterval(3600)
            let countdown = countdownLabel(from: now, to: end, ongoing: true)
            let state = RendezvousActivityAttributes.ContentState(
                currentTitle: current.title,
                currentTime: current.time,
                nextTitle: result.next?.title,
                nextTime: result.next?.time,
                nextLocation: result.next?.location,
                countdownLabel: countdown,
                targetDate: end,
                updatedAt: now
            )
            return (state, start)
        }

        if let next = result.next,
           let start = ScheduleNowNext.eventStartDate(for: next) {
            let secondsUntil = start.timeIntervalSince(now)
            guard secondsUntil > 0, secondsUntil <= Self.leadTime else { return nil }
            let countdown = countdownLabel(from: now, to: start, ongoing: false)
            let state = RendezvousActivityAttributes.ContentState(
                currentTitle: nil,
                currentTime: nil,
                nextTitle: next.title,
                nextTime: next.time,
                nextLocation: next.location,
                countdownLabel: countdown,
                targetDate: start,
                updatedAt: now
            )
            return (state, start)
        }

        return nil
    }

    private func countdownLabel(from now: Date, to target: Date, ongoing: Bool) -> String {
        let seconds = Int(target.timeIntervalSince(now))
        if ongoing {
            if seconds <= 0 { return "Ending" }
            return "Ends in \(formatDuration(seconds))"
        }
        if seconds <= 0 { return "Starting" }
        return "in \(formatDuration(seconds))"
    }

    private func formatDuration(_ totalSeconds: Int) -> String {
        let seconds = max(0, totalSeconds)
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        if minutes > 0 {
            return "\(minutes)m"
        }
        return "\(seconds)s"
    }

    private func startPeriodicUpdates() {
        updateTask?.cancel()
        updateTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(30))
                guard NotificationService.shared.liveActivityEnabled else {
                    await endAll()
                    return
                }
                guard let snapshot = SharedScheduleStore.load() else { continue }
                let result = ScheduleNowNext.evaluate(items: snapshot.luItems)
                guard let presentation = presentation(for: result, now: Date()) else {
                    await endAll()
                    return
                }
                if let activity = Activity<RendezvousActivityAttributes>.activities.first {
                    await activity.update(
                        ActivityContent(state: presentation.state, staleDate: Date().addingTimeInterval(90))
                    )
                }
            }
        }
    }

    private func observeActivityPushToken(_ activity: Activity<RendezvousActivityAttributes>) {
        Task {
            for await tokenData in activity.pushTokenUpdates {
                let token = tokenData.map { String(format: "%02x", $0) }.joined()
                await registerActivityToken(token)
            }
        }
    }

    private func registerActivityToken(_ token: String) async {
        #if DEBUG
        let environment = "sandbox"
        #else
        let environment = "production"
        #endif

        struct Body: Encodable {
            let activityToken: String
            let bundleId: String
            let environment: String
        }

        var request = URLRequest(url: AppConfig.url(for: "/api/push/activity-register"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode(
            Body(
                activityToken: token,
                bundleId: AppConfig.bundleIdentifier,
                environment: environment
            )
        )
        _ = try? await URLSession.shared.data(for: request)
    }
}
