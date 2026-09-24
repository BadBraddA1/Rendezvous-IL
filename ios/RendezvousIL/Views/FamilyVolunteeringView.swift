import SwiftUI
import UniformTypeIdentifiers

/// Shows what your family signed up for / was assigned, plus pending lesson-bid actions.
struct FamilyVolunteeringView: View {
    @Environment(AppSession.self) private var session
    @State private var payload: FamilyVolunteeringResponse?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var uploadingSignupId: Int?
    @State private var statusMessage: String?
    @State private var fileImporterSignupId: Int?

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
        .fileImporter(
            isPresented: Binding(
                get: { fileImporterSignupId != nil },
                set: { if !$0 { fileImporterSignupId = nil } }
            ),
            allowedContentTypes: [
                .pdf,
                UTType(filenameExtension: "pptx") ?? .data,
                UTType(filenameExtension: "ppt") ?? .data,
            ],
            allowsMultipleSelection: false
        ) { result in
            guard let signupId = fileImporterSignupId else { return }
            fileImporterSignupId = nil
            switch result {
            case .success(let urls):
                guard let url = urls.first else { return }
                Task { await uploadSlides(signupId: signupId, from: url) }
            case .failure(let error):
                statusMessage = error.localizedDescription
            }
        }
    }

    @ViewBuilder
    private func volunteeringContent(_ payload: FamilyVolunteeringResponse) -> some View {
        List {
            if let statusMessage {
                Section {
                    Text(statusMessage)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }

            let pending = payload.volunteers.flatMap(\.pendingActions)
            if !pending.isEmpty {
                Section("Needs your attention") {
                    ForEach(pending) { action in
                        if action.type == "upload_lesson_slides",
                           let volunteer = payload.volunteers.first(where: {
                               $0.pendingActions.contains(where: { $0.id == action.id })
                           }) {
                            Button {
                                fileImporterSignupId = volunteer.id
                            } label: {
                                Label(action.label, systemImage: "arrow.up.doc.fill")
                            }
                            .disabled(uploadingSignupId != nil)
                        } else if let url = URL(string: action.href) {
                            Link(destination: url) {
                                Label(action.label, systemImage: "exclamationmark.circle.fill")
                            }
                        } else {
                            Text(action.label)
                        }
                    }
                }
            }

            let assigned = payload.volunteers.filter {
                $0.worshipAssignment != nil
                    || $0.lessonTopic != nil
                    || $0.lessonSlides != nil
                    || $0.songSet != nil
            }
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
                            if let slides = volunteer.lessonSlides {
                                Text("Slides: \(slides.fileName)")
                                    .font(.footnote)
                                    .foregroundStyle(BrandColors.lake)
                                Button("Replace slides") {
                                    fileImporterSignupId = volunteer.id
                                }
                                .font(.footnote)
                                .disabled(uploadingSignupId != nil)
                            } else if volunteer.lessonTopic != nil {
                                Button {
                                    fileImporterSignupId = volunteer.id
                                } label: {
                                    if uploadingSignupId == volunteer.id {
                                        ProgressView()
                                    } else {
                                        Label("Upload lesson slides", systemImage: "arrow.up.doc")
                                    }
                                }
                                .font(.footnote)
                                .disabled(uploadingSignupId != nil)
                            }
                                if let songSet = volunteer.songSet {
                                ForEach(Array(songSet.songs.enumerated()), id: \.offset) { _, song in
                                    Text("\(song.title) · \(song.versesLabel)")
                                        .font(.footnote)
                                        .foregroundStyle(BrandColors.lake)
                                }
                                if let note = songSet.note, !note.isEmpty {
                                    Text(note)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                if let url = URL(
                                    string: "https://rendezvousil.com/account/volunteering/songs/\(volunteer.id)?year=\(payload.eventYear)"
                                ) {
                                    Link("Edit songs", destination: url)
                                        .font(.footnote)
                                }
                            } else if volunteer.worshipAssignment != nil,
                                      volunteer.volunteerType.localizedCaseInsensitiveContains("leading singing"),
                                      let action = volunteer.pendingActions.first(where: { $0.type == "submit_song_setlist" }),
                                      let url = URL(string: action.href) {
                                Link("Pick songs", destination: url)
                                    .font(.footnote)
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
            let response = try await client.getFamilyVolunteering()
            payload = response
            errorMessage = nil
            await VolunteerReminderService.sync(from: response)
        } catch {
            if payload == nil {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func uploadSlides(signupId: Int, from url: URL) async {
        guard let client = session.apiClient else {
            statusMessage = "Sign in to upload."
            return
        }
        uploadingSignupId = signupId
        statusMessage = "Uploading…"
        defer { uploadingSignupId = nil }

        let accessed = url.startAccessingSecurityScopedResource()
        defer {
            if accessed { url.stopAccessingSecurityScopedResource() }
        }

        do {
            let data = try Data(contentsOf: url)
            let name = url.lastPathComponent
            let mime: String
            switch url.pathExtension.lowercased() {
            case "pdf": mime = "application/pdf"
            case "ppt": mime = "application/vnd.ms-powerpoint"
            default:
                mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            }
            _ = try await client.uploadLessonSlides(
                signupId: signupId,
                fileData: data,
                filename: name,
                mimeType: mime
            )
            statusMessage = "Slides uploaded."
            await load()
        } catch {
            statusMessage = error.localizedDescription
        }
    }
}
