import Foundation

/// Payload at `SongPackItem.ocr_url` (R2 JSON from book/full-song OCR).
struct SongOcrDocument: Decodable, Sendable {
    struct Page: Decodable, Sendable, Identifiable {
        var id: Int { index }
        let index: Int
        let text: String?
        let confidence: Double?
    }

    struct Verse: Decodable, Sendable, Identifiable {
        var id: Int { index }
        let index: Int
        let text: String?
        let lines: [String]?
    }

    let item_id: String?
    let title: String?
    let verse_count: Int?
    let page_count: Int?
    let pages: [Page]?
    let verses: [Verse]?
    let verse_pages: [Int]?
    /// auto | needs_review | confirmed
    let status: String?
    let confidence: Double?
    let method: String?
}

enum SongOcrStore {
    private static var memory: [String: SongOcrDocument] = [:]
    private static let lock = NSLock()

    private static var cacheDirectory: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let dir = docs.appendingPathComponent("song-ocr", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    private static func cacheFile(for itemId: String) -> URL {
        cacheDirectory.appendingPathComponent("\(itemId).json")
    }

    static func cached(itemId: String) -> SongOcrDocument? {
        lock.lock()
        defer { lock.unlock() }
        if let hit = memory[itemId] { return hit }
        let url = cacheFile(for: itemId)
        guard let data = try? Data(contentsOf: url),
              let doc = try? JSONDecoder().decode(SongOcrDocument.self, from: data)
        else { return nil }
        memory[itemId] = doc
        return doc
    }

    static func load(item: SongPackItem) async throws -> SongOcrDocument? {
        guard let raw = item.ocr_url, !raw.isEmpty else { return nil }
        return try await load(itemId: item.id, ocrUrl: raw)
    }

    static func load(itemId: String, ocrUrl: String) async throws -> SongOcrDocument? {
        let cacheKey = itemId + "-" + String(ocrUrl.hashValue)
        if let hit = cached(itemId: cacheKey) { return hit }
        guard let remote = URL(string: ocrUrl) else { return nil }
        var request = URLRequest(url: remote, timeoutInterval: 20)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200 ... 299).contains(http.statusCode) {
            return nil
        }
        let doc = try JSONDecoder().decode(SongOcrDocument.self, from: data)
        try? data.write(to: cacheFile(for: cacheKey), options: .atomic)
        lock.lock()
        memory[cacheKey] = doc
        lock.unlock()
        return doc
    }

    static func removeCached(item: SongPackItem) {
        let cacheKey = item.id + "-" + String((item.ocr_url ?? "").hashValue)
        lock.lock()
        memory.removeValue(forKey: cacheKey)
        lock.unlock()
        try? FileManager.default.removeItem(at: cacheFile(for: cacheKey))
        try? FileManager.default.removeItem(at: cacheFile(for: item.id))
    }

    /// Prefer verse blocks from book/full-song OCR; fall back to page text.
    static func displayPages(from doc: SongOcrDocument) -> [(index: Int, text: String, label: String)] {
        let verses = doc.verses ?? []
        if !verses.isEmpty {
            return verses.compactMap { v in
                let cleaned = cleanPageText(
                    v.text ?? (v.lines ?? []).joined(separator: "\n"),
                    isTitle: false
                )
                guard !cleaned.isEmpty else { return nil }
                return (v.index, cleaned, "Verse \(v.index)")
            }
        }
        let pages = doc.pages ?? []
        return pages.compactMap { page in
            let cleaned = cleanPageText(page.text ?? "", isTitle: page.index == 0)
            guard !cleaned.isEmpty else { return nil }
            if page.index == 0, isMostlyTitleCard(cleaned) { return nil }
            return (page.index, cleaned, "Page \(page.index + 1)")
        }
    }

    private static func cleanPageText(_ raw: String, isTitle: Bool) -> String {
        var lines = raw
            .replacingOccurrences(of: "\u{000c}", with: "\n")
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespaces) }

        if !isTitle {
            lines = lines.filter { line in
                if line.isEmpty { return false }
                let letters = line.unicodeScalars.filter { CharacterSet.letters.contains($0) }.count
                return letters >= 3
            }
        }

        var out: [String] = []
        var blank = false
        for line in lines {
            if line.isEmpty {
                if !blank { out.append("") }
                blank = true
            } else {
                out.append(line)
                blank = false
            }
        }
        return out.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func isMostlyTitleCard(_ text: String) -> Bool {
        let lower = text.lowercased()
        if lower.contains("verse") && text.count < 80 { return true }
        let lines = text.split(whereSeparator: \.isNewline).filter { !$0.isEmpty }
        return lines.count <= 4 && text.count < 120
    }
}
