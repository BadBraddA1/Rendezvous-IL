import SwiftUI

/// Staff: post / schedule announcements and optional app pushes — all in-app.
struct AdminAnnouncementsView: View {
    @Environment(AppSession.self) private var session

    @State private var items: [AdminAnnouncementItem] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var statusMessage: String?

    @State private var title = ""
    @State private var message = ""
    @State private var priority = "normal"
    @State private var showOnLiveUpdates = true
    @State private var showOnSchedule = false
    @State private var sendPush = false
    @State private var scheduleForLater = false
    @State private var publishAt = Date().addingTimeInterval(3600)
    @State private var submitting = false

    var body: some View {
        List {
            if session.canEdit {
                Section("New announcement") {
                    TextField("Title", text: $title)
                    TextField("Message", text: $message, axis: .vertical)
                        .lineLimit(3...6)
                    Picker("Priority", selection: $priority) {
                        Text("Normal").tag("normal")
                        Text("High").tag("high")
                        Text("Urgent").tag("urgent")
                    }
                    Toggle("Show on Live Updates", isOn: $showOnLiveUpdates)
                    Toggle("Show on Schedule", isOn: $showOnSchedule)
                    Toggle("Send app push", isOn: $sendPush)
                    Toggle("Schedule for later (Central)", isOn: $scheduleForLater)
                    if scheduleForLater {
                        DatePicker(
                            "Go live at",
                            selection: $publishAt,
                            displayedComponents: [.date, .hourAndMinute]
                        )
                        .environment(\.timeZone, TimeZone(identifier: "America/Chicago") ?? .current)
                    }
                    Button {
                        Task { await create() }
                    } label: {
                        if submitting {
                            ProgressView()
                        } else {
                            Label(
                                scheduleForLater ? "Schedule announcement" : "Post announcement",
                                systemImage: "paperplane.fill"
                            )
                        }
                    }
                    .disabled(submitting || title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        || message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }

            if let statusMessage {
                Section {
                    Text(statusMessage)
                        .font(.footnote)
                        .foregroundStyle(BrandColors.lake)
                }
            }

            Section("Recent") {
                if isLoading && items.isEmpty {
                    ProgressView("Loading…")
                } else if let errorMessage, items.isEmpty {
                    Text(errorMessage).foregroundStyle(.red)
                } else if items.isEmpty {
                    Text("No announcements yet.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(items) { item in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(item.title)
                                    .font(.subheadline.weight(.semibold))
                                Spacer()
                                if !item.is_active, item.publish_at != nil {
                                    Text("Scheduled")
                                        .font(.caption2.weight(.semibold))
                                        .foregroundStyle(.orange)
                                } else if !item.is_active {
                                    Text("Inactive")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            Text(item.message)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                            HStack(spacing: 8) {
                                if item.send_push == true {
                                    Label(
                                        item.push_sent_at != nil ? "Pushed" : "Push pending",
                                        systemImage: "bell.fill"
                                    )
                                    .font(.caption2)
                                }
                                if item.schedule_event_id != nil {
                                    Text("Event ping")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            if let publish = item.publish_at, !item.is_active {
                                Text("Goes live \(formatCentral(publish))")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            if session.canEdit {
                                Toggle("Active", isOn: Binding(
                                    get: { item.is_active },
                                    set: { newValue in
                                        Task { await setActive(item, isActive: newValue) }
                                    }
                                ))
                                .font(.caption)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .onDelete(perform: session.canEdit ? deleteItems : nil)
                }
            }
        }
        .navigationTitle("Announcements")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        guard let client = session.apiClient else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.getAdminAnnouncements()
            }
            items = response.announcements ?? []
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func create() async {
        guard let client = session.apiClient else { return }
        submitting = true
        statusMessage = nil
        errorMessage = nil
        defer { submitting = false }

        let publishISO: String? = {
            guard scheduleForLater else { return nil }
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime]
            formatter.timeZone = TimeZone(identifier: "America/Chicago")
            return formatter.string(from: publishAt)
        }()

        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.createAdminAnnouncement(
                    AdminCreateAnnouncementBody(
                        title: title.trimmingCharacters(in: .whitespacesAndNewlines),
                        message: message.trimmingCharacters(in: .whitespacesAndNewlines),
                        priority: priority,
                        showOnLiveUpdates: showOnLiveUpdates,
                        showOnSchedule: showOnSchedule,
                        sendPush: sendPush,
                        publishAt: publishISO
                    )
                )
            }
            statusMessage = response.message ?? "Saved"
            title = ""
            message = ""
            priority = "normal"
            showOnLiveUpdates = true
            showOnSchedule = false
            sendPush = false
            scheduleForLater = false
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func setActive(_ item: AdminAnnouncementItem, isActive: Bool) async {
        guard let client = session.apiClient else { return }
        do {
            _ = try await client.setAdminAnnouncementActive(id: item.id, isActive: isActive)
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deleteItems(at offsets: IndexSet) {
        let toDelete = offsets.map { items[$0] }
        Task {
            guard let client = session.apiClient else { return }
            for item in toDelete {
                do {
                    _ = try await client.deleteAdminAnnouncement(id: item.id)
                } catch {
                    errorMessage = error.localizedDescription
                }
            }
            await load()
        }
    }

    private func formatCentral(_ iso: String) -> String {
        guard let date = ISO8601DateFormatter().date(from: iso)
            ?? ISO8601DateFormatter.fractional.date(from: iso)
        else { return iso }
        let formatter = DateFormatter()
        formatter.timeZone = TimeZone(identifier: "America/Chicago")
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date) + " CT"
    }
}

private extension ISO8601DateFormatter {
    static let fractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
}
