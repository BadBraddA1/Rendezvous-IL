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
        } else if result.current != nil || isEventWeek() {
            let attributes = RendezvousActivityAttributes(
                eventYear: schedule?.year ?? snapshot?.eventYear ?? 2027,
                dateRange: schedule?.dateRange ?? snapshot?.dateRange ?? "May 3–7, 2027"
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
                }
            }
        }
    }

    private func isEventWeek() -> Bool {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Chicago")!
        let now = Date()
        guard let start = calendar.date(from: DateComponents(year: 2027, month: 5, day: 3)),
              let end = calendar.date(from: DateComponents(year: 2027, month: 5, day: 8))
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
            Body(activityToken: token, bundleId: "com.rendezvousil.app", environment: environment)
        )
        _ = try? await URLSession.shared.data(for: request)
    }
}
