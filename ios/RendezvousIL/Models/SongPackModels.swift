import Foundation

struct SongPacksResponse: Decodable, Sendable {
    let packs: [SongPackSummary]?
    let year: Int?
    let error: String?
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
}
