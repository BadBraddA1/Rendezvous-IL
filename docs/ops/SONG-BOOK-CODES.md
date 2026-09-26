# Library song book codes (A / B / C)

Printed page numbers collide across hymnals. That is expected — bare `446` in
admin used to match multiple books and made OCR QA confusing.

## Admin convention (display only)

| Code | Book | Example |
|------|------|---------|
| **A** | Songs of Faith and Praise | `A-446 · Hear O Israel` |
| **B** | Sacred Songs of the Church | `B-446 · While We Pray and While We Plead` |
| **C** | The Paperless Hymnal | `C-446 · …` |

Stored `title` values in Turso are unchanged (`446 · …`) so member apps / search
stay the same. Only the Library inspector and `GET /api/admin/songs/library`
add the prefix (`admin_title`, `book_code`).

Search: `A-446`, `B-12`, `C-89`, or bare `446` (all matching books). Filter:
All books / A · SFP / B · SSOC / C · TPH. Deep link: `?song=C-89`.

## Pack IDs

| Code | Slug | Pack ID |
|------|------|---------|
| A | `songs-of-faith-and-praise` | (existing SFP pack) |
| B | `sacred-songs-of-the-church` | `de98d363-5295-4788-b766-5febaa4e202d` |
| C | `the-paperless-hymnal` | `d7b0b452-5467-4099-917d-f10a9d052c0b` |

## Counts

- SFP (A): **895** · SSOC (B): **835** · TPH (C): **~965** (import in progress)
- Shared page numbers A↔B (different songs): **712** — full TSV: [`sfp-ssoc-page-overlaps.tsv`](./sfp-ssoc-page-overlaps.tsv)
- SFP same-number duplicates inside one book: **23** (alt arrangements / descants / chorus-only variants — list below)
- SSOC same-number duplicates: **0**

### SFP internal same-number pairs (need your eye)

These are two pack items that share a printed # inside **A** only:

| # | Titles |
|---|--------|
| 21 | There is a Savior · Thou Art Worthy Great Jehovah |
| 91 | Bring Christ Your Broken Life · Praise to the Lord the Almighty |
| 101 | Holy Ground-Davis · The Church in the Wildwood |
| 195 | Behold a Stranger · Behold the Lamb |
| 288 | Fairest Lord Jesus W-descant · Fairest Lord Jesus |
| 290 | Shine Jesus Shine · The Great Redeemer |
| 357 | Bethlehem-Galilee-Gethsemane (2) · Bethlehem-Galilee-Gethsemane |
| 418 | Breathe On Me Breath of God · …-W-descant |
| 464 | Because He Lives alt · Because He Lives |
| 474 | Thank You Lord-Mabry · …-w-Descant |
| 595 | I come to the Garden Alone · In the Garden |
| 623 | I Am Coming Lord · Tell the Good News |
| 624 | Just As I Am-Worthy is the Lamb · Seeking the Lost |
| 710 | The Lord Bless You and Keep You · …-Single Amen |
| 711 | Blest be the Tie (2) · Blest be the Tie |
| 742 | Tell It To Jesus alone · When upon Lifes Billows |
| 754 | Faith of Our Fathers · …-W-descant |
| 852 | When The Roll Is Called Up · …-Opt End |
| 866 | There's a Crown for Your Cross · …-Chorus |
| 889 | I Am Bound for the Promised · …-w-descant |
| 918 | Out of My Bondage · Revive Us O Lord |
| 974 | The Rock that is Higher-Chorus · The Rock that is Higher |
| 1025 | God of Our Fathers-Howard · God of Our Fathers |

Most look like intentional alt/descant/chorus variants. The ones that look like
**two different songs under one number** (likely bad mapping): **21, 91, 101, 195, 290, 623, 624, 742, 918**.

### Example A vs B at the same #

| # | A (SFP) | B (SSOC) |
|---|---------|----------|
| 2 | We Praise Thee O God | Amazing Grace |
| 446 | Hear O Israel | While We Pray and While We Plead |
| 696 | Once To Every Man | My Faith Looks Up to Thee |
| 888 | Lo What a Glorious Sight | *(SSOC has no 888)* |
