import Foundation

struct SongPacksResponse: Decodable, Sendable {
    let packs: [SongPackSummary]?
    let year: Int?
    let error: String?
}

struct SongSearchResponse: Decodable, Sendable {
    let results: [SongSearchHit]?
    let year: Int?
    let q: String?
    let error: String?
}

struct SongSearchHit: Decodable, Identifiable, Sendable, Hashable {
    var id: String { item_id }
    let pack_id: String
    let pack_name: String
    let is_library: Bool?
    let item_id: String
    let title: String
    let verse_count: Int?
    let sort_order: Int?
}

struct SongPackDetailResponse: Decodable, Sendable {
    let pack: SongPackDetail?
    let error: String?
}

struct SongPackSummary: Decodable, Identifiable, Sendable, Hashable {
    let id: String
    let name: String
    let slug: String
    let description: String?
    let event_year: Int
    let sort_order: Int
    let is_published: Bool
    let is_library: Bool?
    let updated_at: String
    let item_count: Int?
}

struct SongPackDetail: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let slug: String
    let description: String?
    let event_year: Int
    let sort_order: Int
    let is_published: Bool
    let is_library: Bool?
    let updated_at: String
    let items: [SongPackItem]
}

struct SongPackItem: Decodable, Identifiable, Sendable, Hashable {
    let id: String
    let pack_id: String
    let title: String
    let sort_order: Int
    let file_url: String
    let file_type: String
    let byte_size: Int
    let content_hash: String
    let page_count: Int?
    let verse_count: Int?
    /// 0-based PDF page for verse 1, 2, 3… (jump targets).
    let verse_pages: [Int]?
    /// CDN JSON: per-page OCR text for text-only mode (`pages[].text` + `verse_count`).
    let ocr_url: String?
}
