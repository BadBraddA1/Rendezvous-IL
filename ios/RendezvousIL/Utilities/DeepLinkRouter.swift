import Foundation

enum DeepLinkRouter {
    static func tab(for url: URL) -> AppTab? {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return nil
        }

        let path = components.path.lowercased()
        if path.hasPrefix("/schedule") { return .schedule }
        if path.hasPrefix("/directory") { return .more }
        if path.hasPrefix("/account") { return .more }
        if path.hasPrefix("/live-updates") || path.hasPrefix("/updates") { return .updates }
        if path.hasPrefix("/chat") { return .chat }
        if path.hasPrefix("/registration") || path.hasPrefix("/check-in") { return .home }
        return nil
    }
}
