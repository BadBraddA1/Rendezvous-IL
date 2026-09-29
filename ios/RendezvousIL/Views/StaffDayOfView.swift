import SwiftUI

/// Compact day-of ops home for staff (check-in progress, next event, announcements).
struct StaffDayOfView: View {
    @Environment(AppSession.self) private var session

    @State private var payload: StaffDayOfResponse?
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if isLoading && payload == nil {
                ProgressView("Loading day-of…")
            } else if let errorMessage, payload == nil {
                ContentUnavailableView(
                    "Couldn’t load",
                    systemImage: "exclamationmark.triangle",
                    description: Text(errorMessage)
                )
            } else if let payload {
                List {
                    Section("Check-in") {
                        HStack {
                            Label("Checked in", systemImage: "checkmark.circle.fill")
                            Spacer()
                            Text("\(payload.checkedIn)")
                                .fontWeight(.semibold)
                        }
                        HStack {
                            Label("Still waiting", systemImage: "person.badge.clock")
                            Spacer()
                            Text("\(payload.notCheckedIn)")
                                .fontWeight(.semibold)
                                .foregroundStyle(payload.notCheckedIn > 0 ? BrandColors.coral : .primary)
                        }
                        HStack {
                            Text("Total families")
                            Spacer()
                            Text("\(payload.totalRegistrations)")
                                .foregroundStyle(.secondary)
                        }
                        if session.canCheckIn {
                            NavigationLink {
                                CheckInView()
                            } label: {
                                Label("Open check-in station", systemImage: "person.badge.key")
                            }
                        }
                    }

                    Section("Next up") {
                        if let next = payload.nextEvent {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(next.title)
                                    .font(.headline)
                                Text("\(next.day) · \(next.time)")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                if let location = next.location, !location.isEmpty {
                                    Text(location)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            if session.canEdit {
                                NavigationLink {
                                    AdminEventPingsView()
                                } label: {
                                    Label("Event pings", systemImage: "bell.badge.fill")
                                }
                            }
                        } else {
                            Text("No upcoming schedule events.")
                                .foregroundStyle(.secondary)
                        }
                    }

                    Section("Announcements") {
                        HStack {
                            Text("Active")
                            Spacer()
                            Text("\(payload.activeAnnouncements)")
                                .fontWeight(.semibold)
                        }
                        if session.canEdit {
                            NavigationLink {
                                AdminAnnouncementsView()
                            } label: {
                                Label("Post / schedule", systemImage: "megaphone.fill")
                            }
                        }
                    }

                    Section {
                        Text("Updated \(formatTime(payload.updatedAt))")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
            }
        }
        .navigationTitle("Day-of")
        .navigationBarTitleDisplayMode(.large)
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        guard let client = session.apiClient else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            payload = try await RepositoryFetch.withTimeout {
                try await client.getStaffDayOf()
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func formatTime(_ iso: String) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = f.date(from: iso)
            ?? ISO8601DateFormatter().date(from: iso)
        guard let date else { return iso }
        return date.formatted(date: .omitted, time: .shortened)
    }
}
