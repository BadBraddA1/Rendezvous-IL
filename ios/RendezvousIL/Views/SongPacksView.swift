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
                    description: Text("When Campfire or Racket Ball packs are published, they’ll show up here for offline download.")
                )
            } else if filteredPacks.isEmpty {
                ContentUnavailableView.search(text: packSearch)
            } else {
                List(filteredPacks) { pack in
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
                            }
                            Text("\(pack.item_count ?? 0) songs")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Songs")
        .searchable(text: $packSearch, prompt: "Search packs")
        .refreshable { await loadPacks() }
        .task { await loadPacks() }
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
            // Download only when a pack is opened — never pull an entire library up front.
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

    var body: some View {
        let item = items[index]
        VStack(spacing: 0) {
            SongFileRepresentable(packId: packId, item: item)
                .id(item.id)
                .frame(maxWidth: .infinity, maxHeight: .infinity)

            HStack {
                Button {
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
    }
}

private struct SongFileRepresentable: UIViewControllerRepresentable {
    let packId: String
    let item: SongPackItem

    func makeUIViewController(context: Context) -> UIViewController {
        let local = SongPackStore.localFileURL(packId: packId, item: item)
        if item.file_type == "pdf", FileManager.default.fileExists(atPath: local.path) {
            let pdf = PDFView()
            pdf.autoScales = true
            pdf.document = PDFDocument(url: local)
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
            // Fallback: open remote URL via QL if possible, else blank with message.
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

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    final class Coordinator {
        var dataSource: SongPreviewDataSource?
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
