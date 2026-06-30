import SwiftUI

struct EventReminderSheet: View {
    let item: LUScheduleItem
    @Environment(\.dismiss) private var dismiss
    @State private var selected: EventReminderOffset?
    @State private var errorMessage: String?

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
                }
            }
            .onAppear {
                selected = ReminderService.shared.preference(for: item.id)
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func save() async {
        let granted: Bool
        if NotificationService.shared.authorizationStatus == .notDetermined {
            granted = await NotificationService.shared.requestPermissions()
        } else {
            granted = NotificationService.shared.authorizationStatus == .authorized
                || NotificationService.shared.authorizationStatus == .provisional
        }

        guard granted else {
            errorMessage = "Enable notifications in Settings to use reminders."
            return
        }

        do {
            await ReminderService.shared.setReminder(for: item, offset: selected)
            dismiss()
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
