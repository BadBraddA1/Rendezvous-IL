import SwiftUI

struct EventReminderSheet: View {
    let item: LUScheduleItem
    var allItems: [LUScheduleItem] = []
    @Environment(\.dismiss) private var dismiss
    @State private var selected: EventReminderOffset?
    @State private var errorMessage: String?
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text(item.title)
                        .font(.headline)
                    Text("\(item.day) · \(item.time)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    if let location = item.location {
                        Text(location)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Remind me") {
                    Button("None") {
                        selected = nil
                    }
                    .foregroundStyle(selected == nil ? BrandColors.lake : .primary)

                    ForEach(EventReminderOffset.allCases) { offset in
                        Button(offset.label) {
                            selected = offset
                        }
                        .foregroundStyle(selected == offset ? BrandColors.lake : .primary)
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                            .font(.footnote)
                    }
                }
            }
            .navigationTitle("Event reminder")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { await save() }
                    }
                    .disabled(isSaving)
                }
            }
            .onAppear {
                selected = ReminderService.shared.preference(for: item.id)
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        await NotificationService.shared.refreshAuthorizationStatus()
        let granted: Bool
        if NotificationService.shared.authorizationStatus == .notDetermined {
            granted = await NotificationService.shared.requestPermissions()
        } else {
            let status = NotificationService.shared.authorizationStatus
            granted = status == .authorized || status == .provisional || status == .ephemeral
        }

        guard granted else {
            errorMessage = "Enable notifications in Settings to use reminders."
            return
        }

        do {
            let scheduleItems = allItems.isEmpty ? [item] : allItems
            try await ReminderService.shared.setReminder(
                for: item,
                offset: selected,
                allItems: scheduleItems
            )
            dismiss()
        } catch {
            errorMessage = "Could not schedule reminder. Try again from More → Notifications."
        }
    }
}

#Preview {
    EventReminderSheet(
        item: LUScheduleItem(
            date: "2027-05-03",
            day: "Monday",
            time: "5:30 PM",
            startHour: 17,
            startMinute: 30,
            endHour: nil,
            endMinute: nil,
            title: "Dinner",
            location: "Lakeside Dining Room",
            isMeal: true
        )
    )
}
