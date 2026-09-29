import ActivityKit
import SwiftUI

struct NotificationSettingsView: View {
    @Environment(AppSession.self) private var session
    @Environment(RendezvousRepository.self) private var repository

    @State private var isRescheduling = false
    @State private var rescheduleMessage: String?
    @State private var isRefreshingLiveActivity = false
    @State private var isSendingTestPush = false
    @State private var testPushMessage: String?

    private var notifications: NotificationService { NotificationService.shared }
    private var reminders = ReminderService.shared
    private var reminderCount: Int { reminders.savedReminderCount }
    private var pushService: PushRegistrationService { PushRegistrationService.shared }

    var body: some View {
        Form {
            Section {
                LabeledContent("Permission", value: statusLabel)
                LabeledContent("APNs device", value: pushService.statusSummary)
                if notifications.authorizationStatus == .denied {
                    Button("Open Settings") {
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            UIApplication.shared.open(url)
                        }
                    }
                } else if notifications.authorizationStatus == .notDetermined {
                    Button("Enable notifications") {
                        Task { await requestAndRegister() }
                    }
                } else if notifications.broadcastAlertsEnabled {
                    Button("Re-register for alerts") {
                        Task { await pushService.retryPendingRegistration() }
                    }
                }
            } footer: {
                Text("Event reminders are scheduled on your device. Retreat-wide alerts use Apple Push Notification service (APNs).")
            }

            Section {
                Button {
                    Task { await sendTestPush(sound: "chat") }
                } label: {
                    testPushLabel("Send test chat sound")
                }
                .disabled(isSendingTestPush || session.apiClient == nil)

                Button {
                    Task { await sendTestPush(sound: "announce") }
                } label: {
                    testPushLabel("Send test announcement sound")
                }
                .disabled(isSendingTestPush || session.apiClient == nil)

                if let testPushMessage {
                    Text(testPushMessage)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            } header: {
                Text("Sound test")
            } footer: {
                Text("Lock the phone or switch apps, then tap a button. You should hear chat.caf or announce.caf within a second or two.")
            }

            Section("Retreat alerts") {
                Toggle("Organizer announcements (APNs)", isOn: broadcastBinding)
                Toggle("Live Activity (Lock Screen / Dynamic Island)", isOn: liveActivityBinding)
                LabeledContent("Live Activities", value: liveActivityAuthLabel)
                if notifications.liveActivityEnabled {
                    Button {
                        Task { await refreshLiveActivity() }
                    } label: {
                        if isRefreshingLiveActivity {
                            HStack {
                                ProgressView()
                                Text("Refreshing…")
                            }
                        } else {
                            Text("Refresh Live Activity now")
                        }
                    }
                    .disabled(isRefreshingLiveActivity)
                }
            }

            Section("Event reminders") {
                if reminderCount > 0 {
                    LabeledContent("Saved reminders", value: "\(reminderCount)")
                } else {
                    Text("No event reminders yet.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Text("Open any event on the Schedule tab and tap the bell to set a reminder (5 min, 15 min, 1 hour before, or at start).")
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                Button {
                    Task { await rescheduleReminders() }
                } label: {
                    if isRescheduling {
                        HStack {
                            ProgressView()
                            Text("Rescheduling…")
                        }
                    } else {
                        Text("Reschedule saved reminders")
                    }
                }
                .disabled(isRescheduling)

                if let rescheduleMessage {
                    Text(rescheduleMessage)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }

            Section("Widgets") {
                Text("Add the Rendezvous widget from your Home Screen or Lock Screen for now/next at a glance. Tapping a widget opens the Schedule tab.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Notifications")
        .task {
            await notifications.refreshAuthorizationStatus()
        }
        .refreshable {
            await notifications.refreshAuthorizationStatus()
            await repository.syncSharedSnapshot()
        }
        .onAppear {
            rescheduleMessage = nil
        }
    }

    @ViewBuilder
    private func testPushLabel(_ title: String) -> some View {
        if isSendingTestPush {
            HStack {
                ProgressView()
                Text("Sending…")
            }
        } else {
            Text(title)
        }
    }

    private var broadcastBinding: Binding<Bool> {
        Binding(
            get: { notifications.broadcastAlertsEnabled },
            set: { newValue in
                notifications.broadcastAlertsEnabled = newValue
                if newValue {
                    Task { await requestAndRegister() }
                }
            }
        )
    }

    private var liveActivityBinding: Binding<Bool> {
        Binding(
            get: { notifications.liveActivityEnabled },
            set: { notifications.liveActivityEnabled = $0 }
        )
    }

    private var statusLabel: String {
        switch notifications.authorizationStatus {
        case .authorized: return "Allowed"
        case .denied: return "Denied"
        case .provisional: return "Provisional"
        case .ephemeral: return "Ephemeral"
        case .notDetermined: return "Not asked"
        @unknown default: return "Unknown"
        }
    }

    private var liveActivityAuthLabel: String {
        ActivityAuthorizationInfo().areActivitiesEnabled ? "Allowed" : "Disabled in Settings"
    }

    private func refreshLiveActivity() async {
        isRefreshingLiveActivity = true
        defer { isRefreshingLiveActivity = false }
        await repository.syncSharedSnapshot()
    }

    private func sendTestPush(sound: String) async {
        guard let client = session.apiClient else {
            testPushMessage = "Sign in required."
            return
        }
        isSendingTestPush = true
        testPushMessage = nil
        defer { isSendingTestPush = false }

        // Make sure this debug install's token is registered before we fire.
        await pushService.retryPendingRegistration()

        do {
            let response = try await client.sendTestPush(sound: sound)
            if let error = response.error, response.success != true {
                testPushMessage = error
            } else {
                let sent = response.sent ?? 0
                testPushMessage = "Sent \(sent) — lock the phone or leave the app to hear it."
            }
        } catch {
            testPushMessage = error.localizedDescription
        }
    }

    private func requestAndRegister() async {
        await notifications.refreshAuthorizationStatus()
        if notifications.authorizationStatus == .notDetermined {
            let granted = await notifications.requestPermissions()
            if !granted {
                notifications.broadcastAlertsEnabled = false
            }
        } else {
            await notifications.registerForRemoteIfAuthorized()
        }
    }

    private func rescheduleReminders() async {
        isRescheduling = true
        rescheduleMessage = nil
        defer { isRescheduling = false }

        do {
            try await reminders.rescheduleAll(items: repository.schedule?.luItems)
            let count = reminders.savedReminderCount
            rescheduleMessage = count > 0
                ? "Scheduled \(count) reminder\(count == 1 ? "" : "s")."
                : "No upcoming reminders to schedule."
        } catch {
            rescheduleMessage = "Could not schedule reminders: \(error.localizedDescription)"
        }
    }
}

#Preview {
    NavigationStack {
        NotificationSettingsView()
            .environment(AppSession())
            .environment(RendezvousRepository())
    }
}
