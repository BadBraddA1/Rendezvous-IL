import Foundation

enum MoreDeepLink: String, Hashable, Identifiable {
    case directory
    case directoryPhoto
    case account
    case notifications
    case bibleBowl
    case faq
    case about

    var id: String { rawValue }
}

struct DeepLinkDestination: Equatable {
    let tab: AppTab
    let more: MoreDeepLink?
}

enum DeepLinkRouter {
    private static let pendingKey = "deepLink.pendingURL"

    /// Route a URL in-app (tab switch + optional More sub-destination).
    static func open(_ url: URL) {
        guard let destination = destination(for: url) else { return }
        post(destination)
    }

    static func storePending(_ url: URL) {
        UserDefaults.standard.set(url.absoluteString, forKey: pendingKey)
    }

    static func flushPending() {
        guard let raw = UserDefaults.standard.string(forKey: pendingKey),
              let url = URL(string: raw)
        else { return }
        UserDefaults.standard.removeObject(forKey: pendingKey)
        open(url)
    }

    static func destination(for url: URL) -> DeepLinkDestination? {
        if url.scheme?.lowercased() == "rendezvousil" {
            let path = customSchemePath(for: url)
            return destination(forPath: path)
        }

        if let host = url.host?.lowercased(),
           host == "rendezvousil.com" || host.hasSuffix(".rendezvousil.com") {
            return destination(forPath: url.path)
        }

        return nil
    }

    private static func customSchemePath(for url: URL) -> String {
        var parts: [String] = []
        if let host = url.host, !host.isEmpty { parts.append(host) }
        let trimmed = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        if !trimmed.isEmpty { parts.append(trimmed) }
        guard !parts.isEmpty else { return "/" }
        return "/" + parts.joined(separator: "/")
    }

    private static func destination(forPath path: String) -> DeepLinkDestination? {
        let normalized = path.lowercased()
        if normalized.isEmpty || normalized == "/" { return DeepLinkDestination(tab: .home, more: nil) }
        if normalized.hasPrefix("/schedule") { return DeepLinkDestination(tab: .schedule, more: nil) }
        if normalized.hasPrefix("/live-updates") || normalized.hasPrefix("/updates") {
            return DeepLinkDestination(tab: .updates, more: nil)
        }
        if normalized.hasPrefix("/chat") { return DeepLinkDestination(tab: .chat, more: nil) }
        if normalized.hasPrefix("/directory") {
            return DeepLinkDestination(tab: .more, more: .directory)
        }
        if normalized.hasPrefix("/account") {
            return DeepLinkDestination(tab: .more, more: .account)
        }
        if normalized.hasPrefix("/notifications") {
            return DeepLinkDestination(tab: .more, more: .notifications)
        }
        if normalized.hasPrefix("/bible-bowl") || normalized.hasPrefix("/biblebowl") {
            return DeepLinkDestination(tab: .more, more: .bibleBowl)
        }
        if normalized.hasPrefix("/faq") { return DeepLinkDestination(tab: .more, more: .faq) }
        if normalized.hasPrefix("/about") { return DeepLinkDestination(tab: .more, more: .about) }
        if normalized.hasPrefix("/registration") || normalized.hasPrefix("/check-in") {
            return DeepLinkDestination(tab: .home, more: nil)
        }
        if normalized.hasPrefix("/more") { return DeepLinkDestination(tab: .more, more: nil) }
        return nil
    }

    private static func post(_ destination: DeepLinkDestination) {
        var userInfo: [String: Any] = ["tab": destination.tab]
        if let more = destination.more {
            userInfo["more"] = more.rawValue
        }
        NotificationCenter.default.post(
            name: .rendezvousDeepLink,
            object: nil,
            userInfo: userInfo
        )
    }
}
