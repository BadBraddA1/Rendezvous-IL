import ActivityKit
import Foundation

@MainActor
final class LiveActivityManager {
    static let shared = LiveActivityManager()

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

        let hasContent = result.current != nil || result.next != nil
        let duringWeek = isEventWeek()

        guard hasContent || duringWeek else {
            await endAll()
            return
        }

        let state = RendezvousActivityAttributes.ContentState(
            currentTitle: result.current?.title,
            currentTime: result.current?.time,
            nextTitle: result.next?.title,
            nextTime: result.next?.time,
            nextLocation: result.next?.location,
            updatedAt: Date()
        )

        if let activity = Activity<RendezvousActivityAttributes>.activities.first {
            await activity.update(ActivityContent(state: state, staleDate: Date().addingTimeInterval(90)))
            observeActivityPushToken(activity)
        } else if hasContent || duringWeek {
            let attributes = RendezvousActivityAttributes(
                eventYear: schedule?.year ?? snapshot?.eventYear ?? AppConfig.eventYear,
                dateRange: schedule?.dateRange ?? snapshot?.dateRange ?? AppConfig.eventDates
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

    private func startPeriodicUpdates() {
        updateTask?.cancel()
        updateTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(60))
                guard NotificationService.shared.liveActivityEnabled else {
                    await endAll()
                    return
                }
                guard let snapshot = SharedScheduleStore.load() else { continue }
                let result = ScheduleNowNext.evaluate(items: snapshot.luItems)
                let state = RendezvousActivityAttributes.ContentState(
                    currentTitle: result.current?.title,
                    currentTime: result.current?.time,
                    nextTitle: result.next?.title,
                    nextTime: result.next?.time,
                    nextLocation: result.next?.location,
                    updatedAt: Date()
                )
                if let activity = Activity<RendezvousActivityAttributes>.activities.first {
                    await activity.update(ActivityContent(state: state, staleDate: Date().addingTimeInterval(90)))
                } else if result.current == nil && result.next == nil && !isEventWeek() {
                    await endAll()
                    return
                }
            }
        }
    }

    private func isEventWeek() -> Bool {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Chicago")!
        let now = Date()
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        formatter.dateFormat = "yyyy-MM-dd"
        guard let start = formatter.date(from: AppConfig.eventWeekStartISO),
              let end = formatter.date(from: AppConfig.eventWeekEndISO)
        else { return false }
        return now >= start && now < end
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

        guard let url = URL(string: "\(AppConfig.baseURL.absoluteString)/api/push/activity-register") else { return }
        var request = URLRequest(url: url)
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
