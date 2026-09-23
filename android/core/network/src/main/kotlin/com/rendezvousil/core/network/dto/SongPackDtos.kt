package com.rendezvousil.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class SongSearchResponse(
    val results: List<SongSearchHit> = emptyList(),
    val year: Int? = null,
    val q: String? = null,
    val error: String? = null,
)

@Serializable
data class SongSearchHit(
    val pack_id: String,
    val pack_name: String,
    val is_library: Boolean = false,
    val item_id: String,
    val title: String,
    val verse_count: Int? = null,
    val sort_order: Int = 0,
)

@Serializable
data class SongPacksResponse(
    val packs: List<SongPackSummary> = emptyList(),
    val year: Int? = null,
    val error: String? = null,
)

@Serializable
data class SongPackDetailResponse(
    val pack: SongPackDetail? = null,
    val error: String? = null,
)

@Serializable
data class SongPackSummary(
    val id: String,
    val name: String,
    val slug: String,
    val description: String? = null,
    val event_year: Int = 0,
    val sort_order: Int = 0,
    val is_published: Boolean = false,
    val is_library: Boolean = false,
    val updated_at: String = "",
    val item_count: Int? = null,
)

@Serializable
data class SongPackDetail(
    val id: String,
    val name: String,
    val slug: String,
    val description: String? = null,
    val event_year: Int = 0,
    val sort_order: Int = 0,
    val is_published: Boolean = false,
    val is_library: Boolean = false,
    val updated_at: String = "",
    val items: List<SongPackItem> = emptyList(),
)

@Serializable
data class SongPackItem(
    val id: String,
    val pack_id: String,
    val title: String,
    val sort_order: Int = 0,
    val file_url: String,
    val file_type: String,
    val byte_size: Int = 0,
    val content_hash: String,
    val page_count: Int? = null,
    val verse_count: Int? = null,
    /** 0-based PDF page index for verse 1, 2, 3… */
    val verse_pages: List<Int>? = null,
)
