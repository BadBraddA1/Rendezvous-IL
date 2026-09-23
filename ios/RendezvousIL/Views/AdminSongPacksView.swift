import SwiftUI

/// Staff tools to create event packs from a published song book (in-app).
struct AdminSongPacksView: View {
    @Environment(AppSession.self) private var session
    @State private var packs: [SongPackSummary] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showCreate = false
    @State private var newName = ""
    @State private var creating = false

    private var songBooks: [SongPackSummary] {
        packs.filter { $0.is_library == true }
    }

    private var eventPacks: [SongPackSummary] {
        packs.filter { $0.is_library != true }
    }

    var body: some View {
        Group {
            if isLoading && packs.isEmpty {
                ProgressView("Loading packs…")
            } else if let errorMessage, packs.isEmpty {
                ContentUnavailableView(
                    "Couldn’t load packs",
                    systemImage: "exclamationmark.triangle",
                    description: Text(errorMessage)
                )
            } else {
                List {
                    Section {
                        ForEach(songBooks) { pack in
                            NavigationLink {
                                AdminSongPackDetailView(packId: pack.id, packName: pack.name)
                            } label: {
                                adminPackLabel(pack, badge: pack.is_published ? "Published" : "Draft")
                            }
                        }
                    } header: {
                        Text("Song books")
                    } footer: {
                        Text("Full books families can open under Songs → Song books.")
                    }

                    Section {
                        ForEach(eventPacks) { pack in
                            NavigationLink {
                                AdminSongPackDetailView(packId: pack.id, packName: pack.name)
                            } label: {
                                adminPackLabel(pack, badge: pack.is_published ? "Published" : "Draft")
                            }
                        }
                    } header: {
                        Text("Event packs")
                    } footer: {
                        Text("Build these on the fly from a song book, then publish.")
                    }
                }
            }
        }
        .navigationTitle("Build packs")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showCreate = true
                } label: {
                    Label("New pack", systemImage: "plus")
                }
                .disabled(!session.canEdit)
            }
        }
        .sheet(isPresented: $showCreate) {
            NavigationStack {
                Form {
                    TextField("Pack name", text: $newName)
                    Text("Example: Thursday Campfire, Racket Ball Singing")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .navigationTitle("New event pack")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { showCreate = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Create") {
                            Task { await createPack() }
                        }
                        .disabled(newName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || creating)
                    }
                }
            }
            .presentationDetents([.medium])
        }
        .refreshable { await load() }
        .task { await load() }
    }

    @ViewBuilder
    private func adminPackLabel(_ pack: SongPackSummary, badge: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(pack.name)
                    .font(.headline)
                Spacer()
                Text(badge)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            Text("\(pack.item_count ?? 0) songs")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        guard let client = session.apiClient else {
            errorMessage = "Sign in required."
            return
        }
        do {
            let response: SongPacksResponse = try await client.get(
                "/api/admin/songs?year=\(AppConfig.eventYear)"
            )
            packs = response.packs ?? []
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func createPack() async {
        let name = newName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, let client = session.apiClient else { return }
        creating = true
        defer { creating = false }
        do {
            struct Body: Encodable {
                let name: String
                let year: Int
            }
            struct Resp: Decodable {
                let pack: SongPackSummary?
                let error: String?
            }
            let resp: Resp = try await client.post(
                "/api/admin/songs",
                body: Body(name: name, year: AppConfig.eventYear)
            )
            if let err = resp.error { throw APIError.serverMessage(err, 400) }
            newName = ""
            showCreate = false
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct AdminSongPackDetailView: View {
    let packId: String
    let packName: String

    @Environment(AppSession.self) private var session
    @State private var pack: SongPackDetail?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var statusMessage: String?
    @State private var showPicker = false
    @State private var busy = false

    var body: some View {
        Group {
            if isLoading && pack == nil {
                ProgressView("Loading…")
            } else if let errorMessage, pack == nil {
                ContentUnavailableView(
                    "Couldn’t load pack",
                    systemImage: "exclamationmark.triangle",
                    description: Text(errorMessage)
                )
            } else if let pack {
                List {
                    Section {
                        Toggle(
                            "Published to app",
                            isOn: Binding(
                                get: { pack.is_published },
                                set: { next in Task { await setPublished(next) } }
                            )
                        )
                        .disabled(busy || !session.canEdit)

                        if pack.is_library != true {
                            Button {
                                showPicker = true
                            } label: {
                                Label("Add songs from song book", systemImage: "books.vertical")
                            }
                            .disabled(busy || !session.canEdit)
                        }

                        if let statusMessage {
                            Text(statusMessage)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Section("Songs (\(pack.items.count))") {
                        if pack.items.isEmpty {
                            Text("No songs yet — add from a song book.")
                                .foregroundStyle(.secondary)
                        } else {
                            ForEach(pack.items) { item in
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.title)
                                    if let verses = item.verse_count, verses > 0 {
                                        Text(verses == 1 ? "1 verse" : "\(verses) verses")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle(packName)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showPicker) {
            AdminSongBookPickerView(targetPackId: packId) { added in
                statusMessage = added == 0
                    ? "No new songs added (already in pack)."
                    : "Added \(added) song\(added == 1 ? "" : "s")."
                Task { await load() }
            }
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        guard let client = session.apiClient else {
            errorMessage = "Sign in required."
            return
        }
        do {
            struct Resp: Decodable { let pack: SongPackDetail? }
            let resp: Resp = try await client.get("/api/admin/songs/\(packId)")
            pack = resp.pack
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func setPublished(_ published: Bool) async {
        guard let client = session.apiClient else { return }
        busy = true
        defer { busy = false }
        do {
            struct Body: Encodable { let is_published: Bool }
            struct Resp: Decodable { let pack: SongPackDetail?; let error: String? }
            let resp: Resp = try await client.patch(
                "/api/admin/songs/\(packId)",
                body: Body(is_published: published)
            )
            if let err = resp.error { throw APIError.serverMessage(err, 400) }
            if let next = resp.pack { pack = next }
            statusMessage = published ? "Published — families can download it." : "Unpublished."
        } catch {
            statusMessage = error.localizedDescription
            await load()
        }
    }
}

struct AdminSongBookPickerView: View {
    let targetPackId: String
    let onAdded: (Int) -> Void

    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss

    @State private var libraries: [SongPackSummary] = []
    @State private var selectedLibraryId: String?
    @State private var items: [SongPackItem] = []
    @State private var selectedIds: Set<String> = []
    @State private var search = ""
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var filteredItems: [SongPackItem] {
        let q = search.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return items }
        return items.filter { $0.title.localizedCaseInsensitiveContains(q) }
    }

    var body: some View {
        NavigationStack {
            List {
                if !libraries.isEmpty {
                    Section("Song book") {
                        Picker("Book", selection: $selectedLibraryId) {
                            ForEach(libraries) { lib in
                                Text(lib.name).tag(Optional(lib.id))
                            }
                        }
                        .onChange(of: selectedLibraryId) { _, newId in
                            Task { await loadLibrary(newId) }
                        }
                    }
                }

                Section {
                    if isLoading {
                        ProgressView()
                    } else if filteredItems.isEmpty {
                        Text("No songs in this book yet.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(filteredItems) { item in
                            Button {
                                if selectedIds.contains(item.id) {
                                    selectedIds.remove(item.id)
                                } else {
                                    selectedIds.insert(item.id)
                                }
                            } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(item.title)
                                            .foregroundStyle(.primary)
                                        if let verses = item.verse_count, verses > 0 {
                                            Text(verses == 1 ? "1 verse" : "\(verses) verses")
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                    Spacer()
                                    Image(systemName: selectedIds.contains(item.id) ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(selectedIds.contains(item.id) ? BrandColors.lake : .secondary)
                                }
                            }
                        }
                    }
                } header: {
                    Text(selectedIds.isEmpty ? "Songs" : "\(selectedIds.count) selected")
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                            .font(.footnote)
                    }
                }
            }
            .navigationTitle("Add from song book")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $search, prompt: "Search songs")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Adding…" : "Add") {
                        Task { await addSelected() }
                    }
                    .disabled(selectedIds.isEmpty || isSaving)
                }
            }
            .task { await bootstrap() }
        }
    }

    private func bootstrap() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        guard let client = session.apiClient else {
            errorMessage = "Sign in required."
            return
        }
        do {
            let response: SongPacksResponse = try await client.get(
                "/api/admin/songs?year=\(AppConfig.eventYear)"
            )
            libraries = (response.packs ?? []).filter { $0.is_library == true }
            if selectedLibraryId == nil {
                selectedLibraryId = libraries.first?.id
            }
            await loadLibrary(selectedLibraryId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadLibrary(_ id: String?) async {
        guard let id, let client = session.apiClient else {
            items = []
            return
        }
        isLoading = true
        defer { isLoading = false }
        do {
            struct Resp: Decodable { let pack: SongPackDetail? }
            let resp: Resp = try await client.get("/api/admin/songs/\(id)")
            items = resp.pack?.items ?? []
            selectedIds = []
        } catch {
            errorMessage = error.localizedDescription
            items = []
        }
    }

    private func addSelected() async {
        guard let client = session.apiClient, !selectedIds.isEmpty else { return }
        isSaving = true
        defer { isSaving = false }
        do {
            struct Body: Encodable { let copyFromItemIds: [String] }
            struct Resp: Decodable {
                let added: Int?
                let error: String?
            }
            let resp: Resp = try await client.post(
                "/api/admin/songs/\(targetPackId)/items",
                body: Body(copyFromItemIds: Array(selectedIds))
            )
            if let err = resp.error { throw APIError.serverMessage(err, 400) }
            onAdded(resp.added ?? 0)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
