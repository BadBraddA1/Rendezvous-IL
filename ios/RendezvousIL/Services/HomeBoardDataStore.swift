import Foundation

/// On-disk cache so Home layout appears instantly, then refreshes in the background.
enum HomeBoardDataStore {
    private static var cacheDirectory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let folder = base.appendingPathComponent("RendezvousIL/HomeBoard", isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        return folder
    }

    private static func cacheURL(year: Int) -> URL {
        cacheDirectory.appendingPathComponent("home-board-\(year).json")
    }

    static func load(year: Int) -> HomeBoardConfig? {
        guard let data = try? Data(contentsOf: cacheURL(year: year)) else { return nil }
        return try? JSONDecoder().decode(HomeBoardConfig.self, from: data)
    }

    static func save(_ config: HomeBoardConfig, year: Int) {
        guard let data = try? JSONEncoder().encode(config) else { return }
        try? data.write(to: cacheURL(year: year), options: .atomic)
    }
}
