import PDFKit
import QuickLook
import SwiftUI

struct SongPacksView: View {
    @Environment(AppSession.self) private var session
    @State private var packs: [SongPackSummary] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var packSearch = ""
    @State private var songHits: [SongSearchHit] = []
    @State private var isSearchingSongs = false

    private var query: String {
        packSearch.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var filteredPacks: [SongPackSummary] {
        guard !query.isEmpty else { return packs }
        return packs.filter {
            $0.name.localizedCaseInsensitiveContains(query)
                || ($0.description?.localizedCaseInsensitiveContains(query) ?? false)
        }
    }

    private var songBooks: [SongPackSummary] {
        filteredPacks.filter { $0.is_library == true }
    }

    private var eventPacks: [SongPackSummary] {
        filteredPacks.filter { $0.is_library != true }
    }

    private var showEmptySearch: Bool {
        !query.isEmpty && filteredPacks.isEmpty && songHits.isEmpty && !isSearchingSongs
    }

    var body: some View {
        Group {
            if isLoading && packs.isEmpty {
                ProgressView("Loading song packs…")
            } else if let errorMessage, packs.isEmpty {
                ContentUnavailableView(
                    "Songs unavailable",
                    systemImage: "music.note.list",
                    description: Text(errorMessage)
                )
            } else if packs.isEmpty {
                ContentUnavailableView(
                    "No song packs yet",
                    systemImage: "music.note.list",
                    description: Text("Full song books and event packs will show up here when published.")
                )
            } else if showEmptySearch {
                ContentUnavailableView(
                    "No songs match “\(packSearch)”",
                    systemImage: "magnifyingglass",
                    description: Text("Try a page number or part of the title. Songs appear here as the song book finishes importing.")
                )
            } else {
                List {
                    if !songHits.isEmpty {
                        Section {
                            ForEach(songHits) { hit in
                                NavigationLink {
                                    SongPackDetailView(
                                        packId: hit.pack_id,
                                        packName: hit.pack_name,
                                        startItemId: hit.item_id
                                    )
                                } label: {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(hit.title)
                                            .font(.headline)
                                        Text(hit.pack_name)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        } header: {
                            Text("Songs")
                        }
                    }
                    if query.isEmpty || !songBooks.isEmpty {
                        if !songBooks.isEmpty {
                            Section {
                                ForEach(songBooks) { pack in
                                    packRow(pack, fallback: "Full song book")
                                }
                            } header: {
                                Text("Song books")
                            } footer: {
                                if query.isEmpty {
                                    Text("Browse online — open a song to view it. Save offline only if you need it without Wi‑Fi.")
                                }
                            }
                        }
                    }
                    if query.isEmpty || !eventPacks.isEmpty {
                        if !eventPacks.isEmpty {
                            Section {
                                ForEach(eventPacks) { pack in
                                    packRow(pack, fallback: nil)
                                }
                            } header: {
                                Text("Packs")
                            } footer: {
                                if query.isEmpty {
                                    Text("Campfire, racket ball, and other set lists — streams online; optional offline save.")
                                }
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Songs")
        .searchable(text: $packSearch, prompt: "Search songs or packs")
        .onChange(of: packSearch) { _, _ in
            Task { await searchSongs() }
        }
        .toolbar {
            if session.canEdit {
                ToolbarItem(placement: .primaryAction) {
                    NavigationLink {
                        AdminSongPacksView()
                    } label: {
                        Label("Build packs", systemImage: "plus.rectangle.on.folder")
                    }
                }
            }
        }
        .refreshable { await loadPacks() }
        .task { await loadPacks() }
    }

    @ViewBuilder
    private func packRow(_ pack: SongPackSummary, fallback: String?) -> some View {
        NavigationLink {
            SongPackDetailView(packId: pack.id, packName: pack.name)
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text(pack.name)
                    .font(.headline)
                if let description = pack.description, !description.isEmpty {
                    Text(description)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } else if let fallback {
                    Text(fallback)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Text("\(pack.item_count ?? 0) songs")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func loadPacks() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        guard session.isSignedIn, let client = session.apiClient else {
            errorMessage = "Sign in with your family account to download song packs."
            return
        }
        do {
            let response: SongPacksResponse = try await client.get(
                "/api/songs/packs?year=\(AppConfig.eventYear)"
            )
            packs = response.packs ?? []
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func searchSongs() async {
        let q = query
        guard q.count >= 1 else {
            songHits = []
            isSearchingSongs = false
            return
        }
        guard let client = session.apiClient else { return }
        isSearchingSongs = true
        defer { isSearchingSongs = false }
        // Debounce lightly
        try? await Task.sleep(nanoseconds: 250_000_000)
        guard packSearch.trimmingCharacters(in: .whitespacesAndNewlines) == q else { return }
        do {
            let encoded = q.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? q
            let response: SongSearchResponse = try await client.get(
                "/api/songs/search?year=\(AppConfig.eventYear)&q=\(encoded)"
            )
            songHits = response.results ?? []
        } catch {
            songHits = []
        }
    }
}

struct SongPackDetailView: View {
    let packId: String
    let packName: String
    var startItemId: String? = nil

    @Environment(AppSession.self) private var session
    @State private var pack: SongPackDetail?
    @State private var isLoading = true
    @State private var isDownloading = false
    @State private var errorMessage: String?
    @State private var statusMessage: String?
    @State private var songSearch = ""
    @State private var openViewerItemId: String? = nil
    @State private var confirmDownloadAll = false

    private var isLibrary: Bool { pack?.is_library == true }

    private var filteredItems: [SongPackItem] {
        guard let pack else { return [] }
        let q = songSearch.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return pack.items }
        return pack.items.filter { $0.title.localizedCaseInsensitiveContains(q) }
    }

    var body: some View {
        Group {
            if isLoading && pack == nil {
                ProgressView("Loading…")
            } else if let errorMessage, pack == nil {
                ContentUnavailableView("Couldn’t load pack", systemImage: "exclamationmark.triangle", description: Text(errorMessage))
            } else if let pack {
                List {
                    if let description = pack.description, !description.isEmpty {
                        Section {
                            Text(description)
                        }
                    }
                    Section {
                        HStack {
                            Label(
                                downloadStatusLabel(pack: pack),
                                systemImage: SongPackStore.isFullyDownloaded(pack: pack)
                                    ? "checkmark.circle.fill"
                                    : "icloud"
                            )
                            Spacer()
                            if isDownloading {
                                ProgressView()
                            } else {
                                Button(isLibrary ? "Save all offline…" : "Save offline") {
                                    if isLibrary {
                                        confirmDownloadAll = true
                                    } else {
                                        Task { await download() }
                                    }
                                }
                            }
                        }
                        if let statusMessage {
                            Text(statusMessage)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    } footer: {
                        Text("Songs stream online — nothing is saved unless you tap Save offline.")
                    }
                    Section {
                        if filteredItems.isEmpty {
                            Text("No songs match “\(songSearch)”.")
                                .foregroundStyle(.secondary)
                        } else {
                            ForEach(Array(filteredItems.enumerated()), id: \.element.id) { index, item in
                                NavigationLink {
                                    SongItemViewer(
                                        packId: pack.id,
                                        items: filteredItems,
                                        startIndex: index
                                    )
                                } label: {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            // Verbatim — titles already include page · name; never prefix list index.
                                            Text(verbatim: item.title)
                                            if let verses = item.verse_count, verses > 0 {
                                                Text(verses == 1 ? "1 verse" : "\(verses) verses")
                                                    .font(.caption)
                                                    .foregroundStyle(.secondary)
                                            }
                                        }
                                        Spacer()
                                        if SongPackStore.isDownloaded(packId: pack.id, item: item) {
                                            Image(systemName: "checkmark.circle.fill")
                                                .foregroundStyle(BrandColors.lake)
                                        }
                                    }
                                }
                            }
                        }
                    } header: {
                        Text(
                            songSearch.isEmpty
                                ? "Songs"
                                : "Songs (\(filteredItems.count) of \(pack.items.count))"
                        )
                    }
                }
            }
        }
        .navigationTitle(packName)
        .searchable(text: $songSearch, prompt: "Search songs")
        .navigationDestination(item: $openViewerItemId) { itemId in
            if let pack,
               let idx = pack.items.firstIndex(where: { $0.id == itemId }) {
                SongItemViewer(packId: pack.id, items: pack.items, startIndex: idx)
            }
        }
        .confirmationDialog(
            "Save entire song book offline?",
            isPresented: $confirmDownloadAll,
            titleVisibility: .visible
        ) {
            Button("Save all \(pack?.items.count ?? 0) songs", role: .destructive) {
                Task { await download() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Only needed if you want the whole book without Wi‑Fi. Opening songs streams them online.")
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func downloadStatusLabel(pack: SongPackDetail) -> String {
        if SongPackStore.isFullyDownloaded(pack: pack) {
            return "Saved for offline use"
        }
        let n = SongPackStore.downloadedCount(pack: pack)
        if n == 0 {
            return "Streaming online"
        }
        return "\(n) of \(pack.items.count) saved offline"
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        guard let client = session.apiClient else {
            errorMessage = "Sign in with your family account to view song packs."
            return
        }
        do {
            let response: SongPackDetailResponse = try await client.get("/api/songs/packs/\(packId)")
            pack = response.pack
            // Never auto-download — songs stream from CDN when opened.
            if let startItemId, pack?.items.contains(where: { $0.id == startItemId }) == true {
                openViewerItemId = startItemId
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func download() async {
        guard let pack else { return }
        isDownloading = true
        defer { isDownloading = false }
        do {
            let count = try await SongPackStore.downloadPack(pack)
            statusMessage = "Saved \(count) of \(pack.items.count) files on this phone."
            self.pack = pack
        } catch {
            statusMessage = "Save failed — try again on Wi‑Fi."
        }
    }
}

struct SongItemViewer: View {
    enum DisplayMode: String, CaseIterable, Identifiable {
        case slides
        case text
        var id: String { rawValue }
        var label: String {
            switch self {
            case .slides: return "Slides"
            case .text: return "Text"
            }
        }
    }

    let packId: String
    let items: [SongPackItem]
    let startIndex: Int

    @State private var index: Int = 0
    @State private var jumpPage: Int? = nil
    @State private var displayMode: DisplayMode = .slides
    @State private var serverPages: [(index: Int, text: String, label: String)] = []
    @State private var ocrLoading = false
    @State private var ocrFailed = false
    @State private var ocrNeedsReview = false

    private var item: SongPackItem { items[index] }

    private var verseJumpPages: [Int] {
        if let pages = item.verse_pages, !pages.isEmpty { return pages }
        guard let verses = item.verse_count, verses > 1,
              let pageCount = item.page_count, pageCount > verses
        else { return [] }
        let musicStart = 1
        let musicPages = max(1, pageCount - musicStart)
        return (0..<verses).map { v in
            musicStart + (v * musicPages) / verses
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            Picker("View", selection: $displayMode) {
                ForEach(DisplayMode.allCases) { mode in
                    Text(mode.label).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.vertical, 8)

            Group {
                if displayMode == .text {
                    songTextBody
                } else {
                    SongStreamingViewer(packId: packId, item: item, targetPage: jumpPage)
                        .id(item.id)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            if displayMode == .slides, verseJumpPages.count > 1 {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        Text("Verse")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        ForEach(Array(verseJumpPages.enumerated()), id: \.offset) { offset, page in
                            Button("\(offset + 1)") {
                                jumpPage = page
                            }
                            .buttonStyle(.bordered)
                            .tint(BrandColors.lake)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                }
                .background(.bar)
            }

            HStack {
                Button {
                    jumpPage = nil
                    index = max(0, index - 1)
                } label: {
                    Label("Previous", systemImage: "chevron.left")
                }
                .disabled(index == 0)

                Spacer()
                Text("\(index + 1) / \(items.count)")
                    .font(.subheadline.monospacedDigit())
                Spacer()

                Button {
                    jumpPage = nil
                    index = min(items.count - 1, index + 1)
                } label: {
                    Label("Next", systemImage: "chevron.right")
                }
                .disabled(index >= items.count - 1)
            }
            .padding()
            .background(.bar)
        }
        .navigationTitle(item.title)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { index = startIndex }
        .onChange(of: index) { _, _ in
            jumpPage = nil
            serverPages = []
            ocrFailed = false
            ocrNeedsReview = false
            if displayMode == .text {
                Task { await loadServerText() }
            }
        }
        .onChange(of: displayMode) { _, mode in
            if mode == .text {
                Task { await loadServerText() }
            }
        }
        .task(id: "\(item.id)-\(displayMode.rawValue)") {
            if displayMode == .text {
                await loadServerText()
            }
        }
    }

    @ViewBuilder
    private var songTextBody: some View {
        if ocrLoading && serverPages.isEmpty {
            ProgressView("Loading lyrics…")
        } else if ocrNeedsReview && serverPages.isEmpty {
            ContentUnavailableView(
                "Lyrics awaiting review",
                systemImage: "text.badge.checkmark",
                description: Text("This song’s OCR needs a staff confirm. Use Slides for now.")
            )
        } else if ocrFailed || (item.ocr_url == nil && serverPages.isEmpty) {
            ContentUnavailableView(
                "No lyrics yet",
                systemImage: "text.page",
                description: Text("Server lyric OCR hasn’t finished for this song. Use Slides.")
            )
        } else if serverPages.isEmpty {
            ContentUnavailableView(
                "No lyrics found",
                systemImage: "text.page",
                description: Text("Use Slides for the music.")
            )
        } else {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 24) {
                    ForEach(serverPages, id: \.index) { page in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(page.label)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.secondary)
                            Text(page.text)
                                .font(.body)
                                .textSelection(.enabled)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                }
                .padding()
            }
        }
    }

    private func loadServerText() async {
        ocrFailed = false
        ocrNeedsReview = false
        if !serverPages.isEmpty { return }
        guard let raw = item.ocr_url, let url = URL(string: raw) else {
            ocrFailed = true
            return
        }
        ocrLoading = true
        defer { ocrLoading = false }
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            if let http = response as? HTTPURLResponse, !(200 ... 299).contains(http.statusCode) {
                ocrFailed = true
                return
            }
            let doc = try JSONDecoder().decode(SongOcrDocument.self, from: data)
            if doc.status == "needs_review" {
                // Still show text if present so staff-tested phones can preview; flag empty.
                let pages = SongOcrStore.displayPages(from: doc)
                if pages.isEmpty {
                    ocrNeedsReview = true
                    return
                }
                serverPages = pages
                return
            }
            serverPages = SongOcrStore.displayPages(from: doc)
            if serverPages.isEmpty { ocrFailed = true }
        } catch {
            ocrFailed = true
        }
    }
}

/// Streams a song from CDN (or offline cache) without requiring Save offline.
private struct SongStreamingViewer: View {
    let packId: String
    let item: SongPackItem
    var targetPage: Int? = nil

    @State private var data: Data?
    @State private var failed = false

    var body: some View {
        Group {
            if let data {
                SongFileRepresentable(data: data, fileType: item.file_type, targetPage: targetPage)
            } else if failed {
                ContentUnavailableView(
                    "Couldn’t load song",
                    systemImage: "wifi.exclamationmark",
                    description: Text("Check your connection and try again.")
                )
            } else {
                ProgressView("Loading…")
            }
        }
        .task(id: item.id) {
            data = nil
            failed = false
            do {
                data = try await SongPackStore.fileData(packId: packId, item: item)
            } catch {
                failed = true
            }
        }
    }
}

private struct SongFileRepresentable: UIViewControllerRepresentable {
    let data: Data
    let fileType: String
    var targetPage: Int? = nil

    func makeUIViewController(context: Context) -> UIViewController {
        if fileType == "pdf", let doc = PDFDocument(data: data) {
            let pdf = PDFView()
            pdf.autoScales = true
            pdf.displayMode = .singlePageContinuous
            pdf.displayDirection = .vertical
            pdf.document = doc
            context.coordinator.pdfView = pdf
            if let targetPage {
                context.coordinator.goToPage(targetPage)
            }
            let host = UIViewController()
            host.view = pdf
            return host
        }

        let ext = fileType == "pdf" ? "pdf" : "jpg"
        let temp = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension(ext)
        try? data.write(to: temp, options: .atomic)
        context.coordinator.tempURL = temp

        let preview = QLPreviewController()
        let dataSource = SongPreviewDataSource(url: temp)
        context.coordinator.dataSource = dataSource
        preview.dataSource = dataSource
        return preview
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        if let targetPage {
            context.coordinator.goToPage(targetPage)
        }
    }

    static func dismantleUIViewController(_ uiViewController: UIViewController, coordinator: Coordinator) {
        if let temp = coordinator.tempURL {
            try? FileManager.default.removeItem(at: temp)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    final class Coordinator {
        var dataSource: SongPreviewDataSource?
        var tempURL: URL?
        weak var pdfView: PDFView?

        func goToPage(_ index: Int) {
            guard let pdfView, let doc = pdfView.document, index >= 0, index < doc.pageCount,
                  let page = doc.page(at: index)
            else { return }
            pdfView.go(to: page)
        }
    }
}

final class SongPreviewDataSource: NSObject, QLPreviewControllerDataSource {
    let url: URL
    init(url: URL) { self.url = url }
    func numberOfPreviewItems(in controller: QLPreviewController) -> Int { 1 }
    func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
        url as QLPreviewItem
    }
}
