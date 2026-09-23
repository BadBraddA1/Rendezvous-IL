import Foundation

/// Payload at `SongPackItem.ocr_url` (R2 JSON from RunPod fulltext OCR).
struct SongOcrDocument: Decodable, Sendable {
    struct Page: Decodable, Sendable, Identifiable {
        var id: Int { index }
        let index: Int
        let text: String?
    }

    let item_id: String?
    let title: String?
    let verse_count: Int?
    let page_count: Int?
    let pages: [Page]?
    let verse_pages: [Int]?
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
        if let hit = cached(itemId: item.id) { return hit }
        guard let raw = item.ocr_url, let remote = URL(string: raw) else { return nil }
        let (data, response) = try await URLSession.shared.data(from: remote)
        if let http = response as? HTTPURLResponse, !(200 ... 299).contains(http.statusCode) {
            return nil
        }
        let doc = try JSONDecoder().decode(SongOcrDocument.self, from: data)
        try? data.write(to: cacheFile(for: item.id), options: .atomic)
        lock.lock()
        memory[item.id] = doc
        lock.unlock()
        return doc
    }

    /// Lyrics-oriented cleanup of noisy shape-note OCR.
    static func displayPages(from doc: SongOcrDocument) -> [(index: Int, text: String)] {
        let pages = doc.pages ?? []
        return pages.compactMap { page in
            let cleaned = cleanPageText(page.text ?? "", isTitle: page.index == 0)
            guard !cleaned.isEmpty else { return nil }
            // Skip bare title cards in text mode (page · "Name" · N verses).
            if page.index == 0, isMostlyTitleCard(cleaned) { return nil }
            return (page.index, cleaned)
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
                // Drop stave/glyph noise lines with almost no letters.
                return letters >= 3
            }
        }

        // Collapse runs of blank lines.
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
