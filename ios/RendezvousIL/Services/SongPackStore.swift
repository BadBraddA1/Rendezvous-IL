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

    @discardableResult
    static func downloadPack(_ pack: SongPackDetail) async throws -> Int {
        var downloaded = 0
        for item in pack.items {
            let dest = localFileURL(packId: pack.id, item: item)
            if FileManager.default.fileExists(atPath: dest.path) {
                downloaded += 1
                continue
            }
            guard let remote = URL(string: item.file_url) else { continue }
            let (temp, response) = try await URLSession.shared.download(from: remote)
            if let http = response as? HTTPURLResponse, !(200 ... 299).contains(http.statusCode) {
                continue
            }
            if FileManager.default.fileExists(atPath: dest.path) {
                try? FileManager.default.removeItem(at: dest)
            }
            try FileManager.default.moveItem(at: temp, to: dest)
            downloaded += 1
        }
        if let data = try? JSONEncoder().encode(pack.updated_at) {
            try? data.write(to: metaURL(packId: pack.id), options: .atomic)
        }
        return downloaded
    }
}
