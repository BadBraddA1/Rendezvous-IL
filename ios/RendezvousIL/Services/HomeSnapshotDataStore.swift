import Foundation

/// Full Home tab snapshot — paint instantly after first successful load, refresh in the background.
struct HomeSnapshot: Codable, Sendable {
    var eventYear: Int
    var board: HomeBoardConfig?
    var yearHub: YearHubResponse?
    var checkIn: FamilyCheckInResponse?
    var volunteering: FamilyVolunteeringResponse?
    var chatUnreadTotal: Int
    var savedAt: Date
}

/// On-disk Home cache (layout + year-hub/reg + check-in + volunteering + chat badge).
enum HomeSnapshotDataStore {
    private static var cacheDirectory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let folder = base.appendingPathComponent("RendezvousIL/Home", isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        return folder
    }

    private static func snapshotURL(year: Int) -> URL {
        cacheDirectory.appendingPathComponent("home-snapshot-\(year).json")
    }

    static func load(year: Int) -> HomeSnapshot? {
        if let data = try? Data(contentsOf: snapshotURL(year: year)),
           let snap = try? JSONDecoder().decode(HomeSnapshot.self, from: data) {
            return snap
        }
        // Migrate older board-only cache if present.
        if let board = HomeBoardDataStore.load(year: year) {
            return HomeSnapshot(
                eventYear: year,
                board: board,
                yearHub: nil,
                checkIn: nil,
                volunteering: nil,
                chatUnreadTotal: 0,
                savedAt: Date()
            )
        }
        return nil
    }

    static func save(_ snapshot: HomeSnapshot) {
        guard let data = try? JSONEncoder().encode(snapshot) else { return }
        try? data.write(to: snapshotURL(year: snapshot.eventYear), options: .atomic)
        if let board = snapshot.board {
            HomeBoardDataStore.save(board, year: snapshot.eventYear)
        }
    }
}
