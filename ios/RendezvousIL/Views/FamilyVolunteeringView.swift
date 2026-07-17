import SwiftUI

/// Shows what your family signed up for / was assigned, plus pending lesson-bid actions.
struct FamilyVolunteeringView: View {
    @Environment(AppSession.self) private var session
    @State private var payload: FamilyVolunteeringResponse?
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if isLoading && payload == nil {
                ProgressView("Loading volunteering…")
            } else if let errorMessage, payload == nil {
                ContentUnavailableView(
                    "Couldn’t load volunteering",
                    systemImage: "hands.sparkles",
                    description: Text(errorMessage)
                )
            } else if let payload, payload.hasContent == true || !payload.volunteers.isEmpty || !payload.specialAssignments.isEmpty {
                volunteeringContent(payload)
            } else {
                ContentUnavailableView(
                    "Nothing assigned yet",
                    systemImage: "hands.sparkles",
                    description: Text("When your family has worship roles, lesson topics, or special jobs, they’ll show up here.")
                )
            }
        }
        .navigationTitle("Your volunteering")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task { await load() }
    }

    @ViewBuilder
    private func volunteeringContent(_ payload: FamilyVolunteeringResponse) -> some View {
        List {
            let pending = payload.volunteers.flatMap(\.pendingActions)
            if !pending.isEmpty {
                Section("Needs your attention") {
                    ForEach(pending) { action in
                        if let url = URL(string: action.href) {
                            Link(destination: url) {
                                Label(action.label, systemImage: "exclamationmark.circle.fill")
                            }
                        } else {
                            Text(action.label)
                        }
                    }
                }
            }

            let assigned = payload.volunteers.filter { $0.worshipAssignment != nil || $0.lessonTopic != nil }
            if !assigned.isEmpty {
                Section("Your assignments") {
                    ForEach(assigned) { volunteer in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(volunteer.volunteerName)
                                .font(.headline)
                            Text(volunteer.volunteerType)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            if let worship = volunteer.worshipAssignment {
                                Text(
                                    [worship.assignedDate, worship.timeSlot, worship.roleLabel]
                                        .compactMap { $0 }
                                        .filter { !$0.isEmpty }
                                        .joined(separator: " · ")
                                )
                                .font(.footnote)
                            }
                            if let lesson = volunteer.lessonTopic {
                                Text("Topic: \(lesson.topicTitle)")
                                    .font(.footnote)
                                if let title = lesson.lessonTitle, !title.isEmpty {
                                    Text(title).font(.footnote).foregroundStyle(.secondary)
                                }
                                if let scripture = lesson.scriptureReading, !scripture.isEmpty {
                                    Text(scripture).font(.footnote).foregroundStyle(.secondary)
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }

            if !payload.specialAssignments.isEmpty {
                Section("Special assignments") {
                    ForEach(payload.specialAssignments) { item in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.activityName)
                                .font(.headline)
                            Text(
                                [item.matchedName, item.assignedDate, item.timeSlot]
                                    .compactMap { $0 }
                                    .filter { !$0.isEmpty }
                                    .joined(separator: " · ")
                            )
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            if let notes = item.notes, !notes.isEmpty {
                                Text(notes)
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
    }

    private func load() async {
        guard let client = session.apiClient else {
            errorMessage = "Sign in to see volunteering."
            return
        }
        isLoading = true
        defer { isLoading = false }
        do {
            payload = try await client.getFamilyVolunteering()
            errorMessage = nil
        } catch {
            if payload == nil {
                errorMessage = error.localizedDescription
            }
        }
    }
}
