import PDFKit
import QuickLook
import SwiftUI

struct SongPacksView: View {
    @Environment(AppSession.self) private var session
    @State private var packs: [SongPackSummary] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var packSearch = ""

    private var filteredPacks: [SongPackSummary] {
        let q = packSearch.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return packs }
        return packs.filter {
            $0.name.localizedCaseInsensitiveContains(q)
                || ($0.description?.localizedCaseInsensitiveContains(q) ?? false)
        }
    }

    private var songBooks: [SongPackSummary] {
        filteredPacks.filter { $0.is_library == true }
    }

    private var eventPacks: [SongPackSummary] {
        filteredPacks.filter { $0.is_library != true }
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
            } else if filteredPacks.isEmpty {
                ContentUnavailableView.search(text: packSearch)
            } else {
                List {
                    if !songBooks.isEmpty {
                        Section {
                            ForEach(songBooks) { pack in
                                packRow(pack, fallback: "Full song book")
                            }
                        } header: {
                            Text("Song books")
                        } footer: {
                            Text("Open a book to download it — nothing downloads until you tap in.")
                        }
                    }
                    if !eventPacks.isEmpty {
                        Section {
                            ForEach(eventPacks) { pack in
                                packRow(pack, fallback: nil)
                            }
                        } header: {
                            Text("Packs")
                        } footer: {
                            Text("Campfire, racket ball, and other set lists for the week.")
                        }
                    }
                }
            }
        }
        .navigationTitle("Songs")
        .searchable(text: $packSearch, prompt: "Search packs")
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
}

struct SongPackDetailView: View {
    let packId: String
    let packName: String

    @Environment(AppSession.self) private var session
    @State private var pack: SongPackDetail?
    @State private var isLoading = true
    @State private var isDownloading = false
    @State private var errorMessage: String?
    @State private var statusMessage: String?
    @State private var songSearch = ""

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
                                SongPackStore.isFullyDownloaded(pack: pack)
                                    ? "Downloaded for offline use"
                                    : "\(SongPackStore.downloadedCount(pack: pack)) of \(pack.items.count) downloaded",
                                systemImage: SongPackStore.isFullyDownloaded(pack: pack)
                                    ? "checkmark.circle.fill"
                                    : "arrow.down.circle"
                            )
                            Spacer()
                            if isDownloading {
                                ProgressView()
                            } else {
                                Button("Download") {
                                    Task { await download() }
                                }
                            }
                        }
                        if let statusMessage {
                            Text(statusMessage)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
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
                                            Text(item.title)
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
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        guard let client = session.apiClient else {
            errorMessage = "Sign in with your family account to download song packs."
            return
        }
        do {
            let response: SongPackDetailResponse = try await client.get("/api/songs/packs/\(packId)")
            pack = response.pack
            if let pack, !SongPackStore.isFullyDownloaded(pack: pack) {
                await download()
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
            statusMessage = "Download failed — try again on Wi‑Fi."
        }
    }
}

struct SongItemViewer: View {
    let packId: String
    let items: [SongPackItem]
    let startIndex: Int

    @State private var index: Int = 0
    @State private var jumpPage: Int? = nil

    private var item: SongPackItem { items[index] }

    private var verseJumpPages: [Int] {
        if let pages = item.verse_pages, !pages.isEmpty { return pages }
        // Fallback: even spacing across music pages (skip likely title page).
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
            SongFileRepresentable(packId: packId, item: item, targetPage: jumpPage)
                .id(item.id)
                .frame(maxWidth: .infinity, maxHeight: .infinity)

            if verseJumpPages.count > 1 {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        Text("Verse")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        ForEach(Array(verseJumpPages.enumerated()), id: \.offset) { offset, page in
                            let verse = offset + 1
                            Button("\(verse)") {
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
        .onChange(of: index) { _, _ in jumpPage = nil }
    }
}

private struct SongFileRepresentable: UIViewControllerRepresentable {
    let packId: String
    let item: SongPackItem
    var targetPage: Int? = nil

    func makeUIViewController(context: Context) -> UIViewController {
        let local = SongPackStore.localFileURL(packId: packId, item: item)
        if item.file_type == "pdf", FileManager.default.fileExists(atPath: local.path) {
            let pdf = PDFView()
            pdf.autoScales = true
            pdf.displayMode = .singlePageContinuous
            pdf.displayDirection = .vertical
            pdf.document = PDFDocument(url: local)
            context.coordinator.pdfView = pdf
            if let targetPage {
                context.coordinator.goToPage(targetPage)
            }
            let host = UIViewController()
            host.view = pdf
            return host
        }

        if FileManager.default.fileExists(atPath: local.path) {
            let preview = QLPreviewController()
            let dataSource = SongPreviewDataSource(url: local)
            context.coordinator.dataSource = dataSource
            preview.dataSource = dataSource
            return preview
        }

        if let remote = URL(string: item.file_url) {
            let web = UIViewController()
            let label = UILabel()
            label.text = "File not downloaded yet.\nGo back and tap Download."
            label.numberOfLines = 0
            label.textAlignment = .center
            label.translatesAutoresizingMaskIntoConstraints = false
            web.view.backgroundColor = .systemBackground
            web.view.addSubview(label)
            NSLayoutConstraint.activate([
                label.centerXAnchor.constraint(equalTo: web.view.centerXAnchor),
                label.centerYAnchor.constraint(equalTo: web.view.centerYAnchor),
                label.leadingAnchor.constraint(equalTo: web.view.leadingAnchor, constant: 24),
                label.trailingAnchor.constraint(equalTo: web.view.trailingAnchor, constant: -24),
            ])
            _ = remote
            return web
        }

        return UIViewController()
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        if let targetPage {
            context.coordinator.goToPage(targetPage)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    final class Coordinator {
        var dataSource: SongPreviewDataSource?
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
