import SwiftUI

struct NotificationSettingsView: View {
    @Environment(RendezvousRepository.self) private var repository

    private var notifications: NotificationService { NotificationService.shared }

    var body: some View {
        Form {
            Section {
                LabeledContent("Permission", value: statusLabel)
                if notifications.authorizationStatus == .denied {
                    Button("Open Settings") {
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            UIApplication.shared.open(url)
                        }
                    }
                } else if notifications.authorizationStatus == .notDetermined {
                    Button("Enable notifications") {
                        Task { _ = await notifications.requestPermissions() }
                    }
                }
            } footer: {
                Text("Event reminders are scheduled on your device. Retreat-wide alerts use Apple Push Notification service (APNs).")
            }

            Section("Retreat alerts") {
                Toggle("Organizer announcements (APNs)", isOn: broadcastBinding)
                Toggle("Live Activity (Lock Screen / Dynamic Island)", isOn: liveActivityBinding)
            }

            Section("Event reminders") {
                Text("Open any event on the Schedule tab and tap the bell to set a reminder (5 min, 15 min, 1 hour before, or at start).")
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                Button("Reschedule saved reminders") {
                    Task {
                        await ReminderService.shared.rescheduleAll(items: repository.schedule?.luItems)
                    }
                }
            }

            Section("Widgets") {
                Text("Add the Rendezvous widget from your Home Screen or Lock Screen for now/next at a glance.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Notifications")
        .task {
            await notifications.refreshAuthorizationStatus()
        }
    }

    private var broadcastBinding: Binding<Bool> {
        Binding(
            get: { notifications.broadcastAlertsEnabled },
            set: { newValue in
                notifications.broadcastAlertsEnabled = newValue
                if newValue {
                    Task { await notifications.registerForRemoteIfAuthorized() }
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
}

#Preview {
    NavigationStack {
        NotificationSettingsView()
            .environment(RendezvousRepository())
    }
}
