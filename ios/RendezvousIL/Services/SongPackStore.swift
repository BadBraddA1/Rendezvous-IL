import Foundation

enum SongPackStore {
    private static var rootURL: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let root = docs.appendingPathComponent("song-packs", isDirectory: true)
        try? FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        return root
    }

    private static func packDirectory(packId: String) -> URL {
        let dir = rootURL.appendingPathComponent(packId, isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    private static func metaURL(packId: String) -> URL {
        packDirectory(packId: packId).appendingPathComponent("meta.json")
    }

    static func localFileURL(packId: String, item: SongPackItem) -> URL {
        let remoteExt = URL(string: item.file_url)?.pathExtension.lowercased() ?? ""
        let ext: String
        if item.file_type == "pdf" {
            ext = "pdf"
        } else if ["png", "webp", "jpg", "jpeg"].contains(remoteExt) {
            ext = remoteExt == "jpeg" ? "jpg" : remoteExt
        } else {
            ext = "jpg"
        }
        return packDirectory(packId: packId).appendingPathComponent("\(item.content_hash).\(ext)")
    }

    static func isDownloaded(packId: String, item: SongPackItem) -> Bool {
        FileManager.default.fileExists(atPath: localFileURL(packId: packId, item: item).path)
    }

    static func downloadedCount(pack: SongPackDetail) -> Int {
        pack.items.filter { isDownloaded(packId: pack.id, item: $0) }.count
    }

    static func isFullyDownloaded(pack: SongPackDetail) -> Bool {
        !pack.items.isEmpty && downloadedCount(pack: pack) == pack.items.count
    }

    /// Fetch song bytes for streaming (uses disk cache if already saved offline).
    static func fileData(packId: String, item: SongPackItem) async throws -> Data {
        let local = localFileURL(packId: packId, item: item)
        if FileManager.default.fileExists(atPath: local.path),
           let data = try? Data(contentsOf: local) {
            return data
        }
        guard let remote = URL(string: item.file_url) else {
            throw URLError(.badURL)
        }
        let (data, response) = try await URLSession.shared.data(from: remote)
        if let http = response as? HTTPURLResponse, !(200 ... 299).contains(http.statusCode) {
            throw URLError(.badServerResponse)
        }
        return data
    }

    @discardableResult
    static func downloadItem(packId: String, item: SongPackItem) async throws -> Bool {
        let dest = localFileURL(packId: packId, item: item)
        if FileManager.default.fileExists(atPath: dest.path) {
            _ = try? await SongOcrStore.load(item: item)
            return true
        }
        guard let remote = URL(string: item.file_url) else { return false }
        let (temp, response) = try await URLSession.shared.download(from: remote)
        if let http = response as? HTTPURLResponse, !(200 ... 299).contains(http.statusCode) {
            return false
        }
        if FileManager.default.fileExists(atPath: dest.path) {
            try? FileManager.default.removeItem(at: dest)
        }
        try FileManager.default.moveItem(at: temp, to: dest)
        // Cache lyrics JSON so Text mode works offline after Save.
        _ = try? await SongOcrStore.load(item: item)
        return true
    }

    @discardableResult
    static func downloadPack(_ pack: SongPackDetail) async throws -> Int {
        var downloaded = 0
        for item in pack.items {
            if try await downloadItem(packId: pack.id, item: item) {
                downloaded += 1
            }
        }
        if let data = try? JSONEncoder().encode(pack.updated_at) {
            try? data.write(to: metaURL(packId: pack.id), options: .atomic)
        }
        return downloaded
    }

    /// Delete one song’s offline PDF/image (and its OCR cache). Streaming still works.
    @discardableResult
    static func removeItem(packId: String, item: SongPackItem) -> Bool {
        let dest = localFileURL(packId: packId, item: item)
        guard FileManager.default.fileExists(atPath: dest.path) else {
            SongOcrStore.removeCached(item: item)
            return false
        }
        try? FileManager.default.removeItem(at: dest)
        SongOcrStore.removeCached(item: item)
        return true
    }

    /// Delete all offline copies for a pack. Keeps the pack list; songs stream from CDN again.
    @discardableResult
    static func removePack(packId: String, items: [SongPackItem] = []) -> Int {
        for item in items {
            SongOcrStore.removeCached(item: item)
        }
        let dir = packDirectory(packId: packId)
        guard FileManager.default.fileExists(atPath: dir.path) else { return 0 }
        let before = (try? FileManager.default.contentsOfDirectory(atPath: dir.path))?
            .filter { !$0.hasSuffix("meta.json") }.count ?? 0
        try? FileManager.default.removeItem(at: dir)
        return before
    }
}
