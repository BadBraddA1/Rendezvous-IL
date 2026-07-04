import Foundation

/// On-disk cache so the family directory appears instantly, then refreshes in the background.
enum DirectoryDataStore {
    private static var cacheDirectory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let folder = base.appendingPathComponent("RendezvousIL/Directory", isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        return folder
    }

    private static func cacheURL(year: Int) -> URL {
        cacheDirectory.appendingPathComponent("directory-\(year).json")
    }

    private static func yearsURL() -> URL {
        cacheDirectory.appendingPathComponent("directory-years.json")
    }

    static func loadFamilies(year: Int) -> [DirectoryFamily]? {
        guard let data = try? Data(contentsOf: cacheURL(year: year)) else { return nil }
        return try? JSONDecoder().decode([DirectoryFamily].self, from: data)
    }

    static func saveFamilies(_ families: [DirectoryFamily], year: Int) {
        guard let data = try? JSONEncoder().encode(families) else { return }
        try? data.write(to: cacheURL(year: year), options: .atomic)
    }

    static func loadYears() -> [Int]? {
        guard let data = try? Data(contentsOf: yearsURL()) else { return nil }
        return try? JSONDecoder().decode([Int].self, from: data)
    }

    static func saveYears(_ years: [Int]) {
        guard let data = try? JSONEncoder().encode(years) else { return }
        try? data.write(to: yearsURL(), options: .atomic)
    }
}
