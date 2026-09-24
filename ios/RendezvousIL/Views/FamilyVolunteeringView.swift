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
                        } else if action.type == "submit_song_setlist",
                                  let volunteer = payload.volunteers.first(where: {
                                      $0.pendingActions.contains(where: { $0.id == action.id })
                                  }) {
                            NavigationLink {
                                WorshipSongSetView(
                                    signupId: volunteer.id,
                                    volunteerName: volunteer.volunteerName,
                                    eventYear: payload.eventYear
                                ) {
                                    Task { await load() }
                                }
                            } label: {
                                Label(action.label, systemImage: "music.note.list")
                            }
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
                                NavigationLink("Edit songs") {
                                    WorshipSongSetView(
                                        signupId: volunteer.id,
                                        volunteerName: volunteer.volunteerName,
                                        eventYear: payload.eventYear
                                    ) {
                                        Task { await load() }
                                    }
                                }
                                .font(.footnote)
                            } else if volunteer.worshipAssignment != nil,
                                      volunteer.volunteerType.localizedCaseInsensitiveContains("leading singing") {
                                NavigationLink("Pick songs") {
                                    WorshipSongSetView(
                                        signupId: volunteer.id,
                                        volunteerName: volunteer.volunteerName,
                                        eventYear: payload.eventYear
                                    ) {
                                        Task { await load() }
                                    }
                                }
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

/// In-app song set editor for Leading singing volunteers.
struct WorshipSongSetView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss

    let signupId: Int
    let volunteerName: String
    let eventYear: Int
    var onSaved: () -> Void

    @State private var songs: [WorshipSongPickPayload] = []
    @State private var note = ""
    @State private var query = ""
    @State private var hits: [SongSearchHit] = []
    @State private var isLoading = true
    @State private var isSearching = false
    @State private var isSaving = false
    @State private var statusMessage: String?
    @State private var searchTask: Task<Void, Never>?

    private let verseOptions = Array(1 ... 8)

    var body: some View {
        List {
            Section {
                Text("Search the song book, add songs, and tap which verses you’ll lead.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Section("Search") {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    TextField("957 or title", text: $query)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .onChange(of: query) { _, _ in
                            scheduleSearch()
                        }
                }
                if isSearching {
                    ProgressView()
                }
                ForEach(hits.prefix(12)) { hit in
                    Button {
                        addHit(hit)
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(hit.title).font(.body)
                            Text(hit.pack_name)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            Section("Your songs (\(songs.count))") {
                if songs.isEmpty {
                    Text("No songs yet")
                        .foregroundStyle(.secondary)
                }
                ForEach(Array(songs.enumerated()), id: \.element.id) { index, song in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(song.title).font(.headline)
                            Spacer()
                            Button(role: .destructive) {
                                songs.remove(at: index)
                            } label: {
                                Image(systemName: "trash")
                            }
                            .buttonStyle(.borderless)
                        }
                        Text(song.verses.label)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                verseChip("All", selected: song.verses.mode == "all") {
                                    songs[index].verses = .all
                                }
                                ForEach(verseOptions, id: \.self) { n in
                                    let on =
                                        song.verses.mode == "list"
                                        && (song.verses.verses ?? []).contains(n)
                                    verseChip("\(n)", selected: on) {
                                        toggleVerse(at: index, verse: n)
                                    }
                                }
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
            }

            Section("Note (optional)") {
                TextField("Slow on the chorus…", text: $note)
            }

            if let statusMessage {
                Section {
                    Text(statusMessage).font(.footnote).foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle(volunteerName.isEmpty ? "Songs" : volunteerName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Submit") {
                    Task { await save() }
                }
                .disabled(isSaving || songs.isEmpty)
            }
        }
        .overlay {
            if isLoading {
                ProgressView("Loading…")
            }
        }
        .task { await loadExisting() }
    }

    @ViewBuilder
    private func verseChip(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(selected ? BrandColors.lake : Color(.secondarySystemFill))
                .foregroundStyle(selected ? Color.white : Color.primary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func loadExisting() async {
        guard let client = session.apiClient else {
            statusMessage = "Sign in required."
            isLoading = false
            return
        }
        isLoading = true
        defer { isLoading = false }
        do {
            let response = try await client.getWorshipSongSet(signupId: signupId, year: eventYear)
            songs = response.submission?.songs ?? []
            note = response.submission?.note ?? ""
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func scheduleSearch() {
        searchTask?.cancel()
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard q.count >= 1 else {
            hits = []
            return
        }
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 220_000_000)
            guard !Task.isCancelled else { return }
            await search(q)
        }
    }

    private func search(_ q: String) async {
        guard let client = session.apiClient else { return }
        isSearching = true
        defer { isSearching = false }
        do {
            let response = try await client.searchSongs(query: q, year: eventYear)
            hits = response.results ?? []
        } catch {
            hits = []
        }
    }

    private func addHit(_ hit: SongSearchHit) {
        guard !songs.contains(where: { $0.song_pack_item_id == hit.item_id }) else {
            statusMessage = "Already in your set."
            return
        }
        songs.append(
            WorshipSongPickPayload(
                song_pack_item_id: hit.item_id,
                pack_id: hit.pack_id,
                title: hit.title,
                verses: .all,
                note: nil
            )
        )
        query = ""
        hits = []
    }

    private func toggleVerse(at index: Int, verse: Int) {
        guard songs.indices.contains(index) else { return }
        var current = Set(songs[index].verses.mode == "list" ? (songs[index].verses.verses ?? []) : [])
        if songs[index].verses.mode == "all" {
            songs[index].verses = .list([verse])
            return
        }
        if current.contains(verse) {
            current.remove(verse)
        } else {
            current.insert(verse)
        }
        let list = current.sorted()
        songs[index].verses = list.isEmpty ? .all : .list(list)
    }

    private func save() async {
        guard let client = session.apiClient else {
            statusMessage = "Sign in required."
            return
        }
        isSaving = true
        defer { isSaving = false }
        do {
            _ = try await client.putWorshipSongSet(
                signupId: signupId,
                songs: songs,
                note: note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    ? nil
                    : note.trimmingCharacters(in: .whitespacesAndNewlines),
                year: eventYear
            )
            statusMessage = "Songs submitted."
            onSaved()
            dismiss()
        } catch {
            statusMessage = error.localizedDescription
        }
    }
}
