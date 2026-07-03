import Foundation

enum ScheduleDataSource: String, Equatable, Sendable {
    case bundled
    case cached
    case network
}

/// Bundled JSON + on-disk cache so schedule is never empty offline.
enum ScheduleDataStore {
    private static let cacheFileName = "schedule-cache.json"

    private static var cacheDirectory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let folder = base.appendingPathComponent("RendezvousIL", isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        return folder
    }

    private static var cacheURL: URL {
        cacheDirectory.appendingPathComponent(cacheFileName)
    }

    static func loadBundled() -> SchedulePayload? {
        guard let url = Bundle.main.url(forResource: "schedule-fallback", withExtension: "json"),
              let data = try? Data(contentsOf: url)
        else { return nil }
        return try? JSONDecoder().decode(SchedulePayload.self, from: data)
    }

    static func loadCached() -> SchedulePayload? {
        guard let data = try? Data(contentsOf: cacheURL) else { return nil }
        return try? JSONDecoder().decode(SchedulePayload.self, from: data)
    }

    static func saveCached(_ schedule: SchedulePayload) {
        guard let data = try? JSONEncoder().encode(schedule) else { return }
        try? data.write(to: cacheURL, options: .atomic)
    }

    static func bestOfflineSchedule() -> (schedule: SchedulePayload, source: ScheduleDataSource)? {
        if let cached = loadCached() {
            return (cached, .cached)
        }
        if let bundled = loadBundled() {
            return (bundled, .bundled)
        }
        return nil
    }
}

enum RepositoryFetch {
    /// Network call with a hard timeout so tabs never hang indefinitely.
    static func withTimeout<T: Sendable>(
        seconds: UInt64 = 15,
        operation: @escaping @Sendable () async throws -> T
    ) async throws -> T {
        try await withThrowingTaskGroup(of: T.self) { group in
            group.addTask { try await operation() }
            group.addTask {
                try await Task.sleep(nanoseconds: seconds * 1_000_000_000)
                throw APIError.badStatus(-1)
            }
            guard let result = try await group.next() else {
                throw APIError.badStatus(-1)
            }
            group.cancelAll()
            return result
        }
    }
}
