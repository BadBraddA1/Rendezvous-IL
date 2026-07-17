import Foundation

/// On-disk chat cache so channel lists and threads appear instantly, then refresh in the background.
enum ChatDataStore {
    private static var cacheDirectory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let folder = base.appendingPathComponent("RendezvousIL/Chat", isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        return folder
    }

    private static var channelsURL: URL {
        cacheDirectory.appendingPathComponent("channels.json")
    }

    private static func messagesURL(channelId: String) -> URL {
        let safe = channelId.replacingOccurrences(of: "/", with: "_")
        return cacheDirectory.appendingPathComponent("messages-\(safe).json")
    }

    static func loadChannels() -> [ChatChannelSummary]? {
        guard let data = try? Data(contentsOf: channelsURL) else { return nil }
        return try? JSONDecoder().decode([ChatChannelSummary].self, from: data)
    }

    static func saveChannels(_ channels: [ChatChannelSummary]) {
        guard let data = try? JSONEncoder().encode(channels) else { return }
        try? data.write(to: channelsURL, options: .atomic)
    }

    static func loadMessages(channelId: String) -> [ChatMessage]? {
        guard let data = try? Data(contentsOf: messagesURL(channelId: channelId)) else { return nil }
        return try? JSONDecoder().decode([ChatMessage].self, from: data)
    }

    static func saveMessages(_ messages: [ChatMessage], channelId: String) {
        guard let data = try? JSONEncoder().encode(messages) else { return }
        try? data.write(to: messagesURL(channelId: channelId), options: .atomic)
    }
}
