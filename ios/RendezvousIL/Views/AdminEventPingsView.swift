import SwiftUI

/// Staff: custom organizer pushes tied to schedule events — all in-app.
struct AdminEventPingsView: View {
    @Environment(AppSession.self) private var session

    @State private var events: [AdminScheduleEventRow] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var statusMessage: String?
    @State private var busyId: Int?

    var body: some View {
        List {
            if !session.canEdit {
                Section {
                    Text("Editor or admin role required to send event pings.")
                        .foregroundStyle(.secondary)
                }
            }

            if let statusMessage {
                Section {
                    Text(statusMessage)
                        .font(.footnote)
                        .foregroundStyle(BrandColors.lake)
                }
            }

            if isLoading && events.isEmpty {
                ProgressView("Loading schedule…")
            } else if let errorMessage, events.isEmpty {
                Text(errorMessage).foregroundStyle(.red)
            } else if events.isEmpty {
                Text("No schedule events for \(AppConfig.eventYear).")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(groupedKeys, id: \.self) { key in
                    Section(header: Text(sectionTitle(key))) {
                        ForEach(grouped[key] ?? []) { event in
                            eventRow(event)
                        }
                    }
                }
            }
        }
        .navigationTitle("Event pings")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task { await load() }
    }

    private var grouped: [String: [AdminScheduleEventRow]] {
        Dictionary(grouping: events) { event in
            event.event_date ?? event.day
        }
    }

    private var groupedKeys: [String] {
        grouped.keys.sorted()
    }

    private func sectionTitle(_ key: String) -> String {
        if key.count == 10, key.contains("-") {
            return key
        }
        return key
    }

    @ViewBuilder
    private func eventRow(_ event: AdminScheduleEventRow) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(event.time)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(BrandColors.lake)
                    .frame(width: 72, alignment: .leading)
                VStack(alignment: .leading, spacing: 2) {
                    Text(event.title)
                        .font(.subheadline.weight(.semibold))
                    if let location = event.location, !location.isEmpty {
                        Text(location)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            if session.canEdit {
                HStack(spacing: 8) {
                    Button("Ping now") {
                        Task { await ping(event, mode: "now") }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(BrandColors.lake)
                    .disabled(busyId == event.id)

                    Button("At start") {
                        Task { await ping(event, mode: "at_start") }
                    }
                    .buttonStyle(.bordered)
                    .disabled(busyId == event.id)

                    Button("−10 min") {
                        Task { await ping(event, mode: "minutes_before", minutesBefore: 10) }
                    }
                    .buttonStyle(.bordered)
                    .disabled(busyId == event.id)

                    if busyId == event.id {
                        ProgressView()
                    }
                }
                .font(.caption.weight(.semibold))
            }
        }
        .padding(.vertical, 4)
    }

    private func load() async {
        guard let client = session.apiClient else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.getAdminScheduleEvents()
            }
            events = response.events ?? []
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func ping(
        _ event: AdminScheduleEventRow,
        mode: String,
        minutesBefore: Int? = nil
    ) async {
        guard let client = session.apiClient else { return }
        busyId = event.id
        statusMessage = nil
        errorMessage = nil
        defer { busyId = nil }

        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.pingScheduleEvent(
                    id: event.id,
                    mode: mode,
                    minutesBefore: minutesBefore
                )
            }
            if mode == "now" {
                let n = response.push?.recipients
                statusMessage = n != nil
                    ? "Pinged “\(event.title)” · \(n!) devices"
                    : "Pinged “\(event.title)”"
            } else {
                statusMessage = "Scheduled ping for “\(event.title)” — see Announcements"
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
