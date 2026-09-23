import Foundation
import PDFKit
import Vision
import UIKit

/// On-device lyrics OCR from song PDFs (shape-note exports have unusable embedded text).
enum SongVisionOcr {
    struct PageText: Identifiable, Sendable {
        var id: Int { index }
        let index: Int
        let text: String
    }

    private static var memory: [String: [PageText]] = [:]
    private static let lock = NSLock()

    private static var cacheDirectory: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let dir = docs.appendingPathComponent("song-vision-ocr", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    private static func cacheFile(contentHash: String) -> URL {
        cacheDirectory.appendingPathComponent("\(contentHash).json")
    }

    static func cached(contentHash: String) -> [PageText]? {
        lock.lock()
        defer { lock.unlock() }
        if let hit = memory[contentHash] { return hit }
        let url = cacheFile(for: contentHash)
        guard let data = try? Data(contentsOf: url),
              let rows = try? JSONDecoder().decode([[String: String]].self, from: data)
        else { return nil }
        let pages = rows.compactMap { row -> PageText? in
            guard let i = Int(row["index"] ?? ""), let t = row["text"], !t.isEmpty else { return nil }
            return PageText(index: i, text: t)
        }
        memory[contentHash] = pages
        return pages
    }

    private static func cacheFile(for contentHash: String) -> URL { cacheFile(contentHash: contentHash) }

    static func recognize(
        pdfData: Data,
        contentHash: String,
        skipTitlePage: Bool = true
    ) async throws -> [PageText] {
        if let hit = cached(contentHash: contentHash) { return hit }

        guard let doc = PDFDocument(data: pdfData), doc.pageCount > 0 else { return [] }

        var pages: [PageText] = []
        let start = skipTitlePage && doc.pageCount > 1 ? 1 : 0
        for i in start..<doc.pageCount {
            guard let page = doc.page(at: i),
                  let cgImage = render(page: page)
            else { continue }
            let text = try await recognizeImage(cgImage)
            let cleaned = cleanLyrics(text)
            if !cleaned.isEmpty {
                pages.append(PageText(index: i, text: cleaned))
            }
        }

        let payload = pages.map { ["index": String($0.index), "text": $0.text] }
        if let data = try? JSONEncoder().encode(payload) {
            try? data.write(to: cacheFile(contentHash: contentHash), options: .atomic)
        }
        lock.lock()
        memory[contentHash] = pages
        lock.unlock()
        return pages
    }

    static func recognize(
        pdfURL: URL,
        contentHash: String,
        skipTitlePage: Bool = true
    ) async throws -> [PageText] {
        let data = try Data(contentsOf: pdfURL)
        return try await recognize(pdfData: data, contentHash: contentHash, skipTitlePage: skipTitlePage)
    }

    private static func render(page: PDFPage, scale: CGFloat = 2.5) -> CGImage? {
        let bounds = page.bounds(for: .mediaBox)
        let size = CGSize(width: bounds.width * scale, height: bounds.height * scale)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let renderer = UIGraphicsImageRenderer(size: size, format: format)
        let image = renderer.image { ctx in
            UIColor.white.setFill()
            ctx.fill(CGRect(origin: .zero, size: size))
            ctx.cgContext.saveGState()
            ctx.cgContext.translateBy(x: 0, y: size.height)
            ctx.cgContext.scaleBy(x: scale, y: -scale)
            page.draw(with: .mediaBox, to: ctx.cgContext)
            ctx.cgContext.restoreGState()
        }
        return image.cgImage
    }

    private static func recognizeImage(_ image: CGImage) async throws -> String {
        try await withCheckedThrowingContinuation { cont in
            let request = VNRecognizeTextRequest { request, error in
                if let error {
                    cont.resume(throwing: error)
                    return
                }
                let observations = (request.results as? [VNRecognizedTextObservation]) ?? []
                let lines = observations.compactMap { $0.topCandidates(1).first?.string }
                cont.resume(returning: lines.joined(separator: "\n"))
            }
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            request.recognitionLanguages = ["en-US"]
            // Prefer middle/lower band later via cleanup; full page for now.
            let handler = VNImageRequestHandler(cgImage: image, options: [:])
            do {
                try handler.perform([request])
            } catch {
                cont.resume(throwing: error)
            }
        }
    }

    /// Keep lyric-like lines; drop stave glyphs, shape-note letter rows, headers.
    static func cleanLyrics(_ raw: String) -> String {
        let lines = raw
            .replacingOccurrences(of: "\u{000c}", with: "\n")
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespaces) }

        var kept: [String] = []
        for line in lines {
            if line.isEmpty { continue }
            if isJunkLine(line) { continue }
            kept.append(line)
        }

        // Merge hyphenated syllable runs that Vision sometimes splits oddly — leave as-is for now.
        var out: [String] = []
        var blank = false
        for line in kept {
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

    private static func isJunkLine(_ line: String) -> Bool {
        let lower = line.lowercased()
        if lower.hasPrefix("presentation ©") || lower.contains("taylor publications") {
            return true
        }
        // Pure page headers like "Sing Amen 87"
        if line.range(of: #"^\d{1,4}$"#, options: .regularExpression) != nil {
            return true
        }
        let letters = line.unicodeScalars.filter { CharacterSet.letters.contains($0) }.count
        let digits = line.unicodeScalars.filter { CharacterSet.decimalDigits.contains($0) }.count
        if letters < 4 { return true }

        // Rows of shape-note solfege / single letters: "d r m f s l t"
        let tokens = line.split(whereSeparator: { $0.isWhitespace || $0 == "-" }).map(String.init)
        if tokens.count >= 3 {
            let short = tokens.filter { $0.count <= 2 }.count
            if Double(short) / Double(tokens.count) > 0.7, letters < tokens.count * 2 {
                return true
            }
        }

        // Mostly symbols / no spaces and few vowels → stave OCR noise
        let vowels = lower.unicodeScalars.filter { "aeiou".unicodeScalars.contains($0) }.count
        if letters > 0, Double(vowels) / Double(letters) < 0.12, !line.contains("-") {
            return true
        }
        if digits > letters { return true }
        return false
    }
}
