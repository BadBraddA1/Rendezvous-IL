import Foundation

enum MoreDeepLink: String, Hashable, Identifiable {
    case directory
    case directoryPhoto
    case account
    case notifications
    case bibleBowl
    case faq
    case about
    case map

    var id: String { rawValue }
}

struct DeepLinkDestination: Equatable {
    let tab: AppTab
    let more: MoreDeepLink?
    let mapPinId: String?
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
        let pinId = URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first(where: { $0.name == "pin" })?
            .value

        if url.scheme?.lowercased() == "rendezvousil" {
            let path = customSchemePath(for: url)
            return destination(forPath: path, mapPinId: pinId)
        }

        if let host = url.host?.lowercased(),
           host == "rendezvousil.com" || host.hasSuffix(".rendezvousil.com") {
            return destination(forPath: url.path, mapPinId: pinId)
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

    /// True for `rendezvousil://app-review-demo` (and https equivalent path).
    static func isAppReviewDemoURL(_ url: URL) -> Bool {
        if url.scheme?.lowercased() == "rendezvousil" {
            let path = customSchemePath(for: url).lowercased()
            return path == "/app-review-demo" || path.hasPrefix("/app-review-demo/")
        }
        if let host = url.host?.lowercased(),
           host == "rendezvousil.com" || host.hasSuffix(".rendezvousil.com") {
            let path = url.path.lowercased()
            return path == "/app-review-demo" || path.hasPrefix("/app-review-demo/")
        }
        return false
    }

    private static func destination(forPath path: String, mapPinId: String? = nil) -> DeepLinkDestination? {
        let normalized = path.lowercased()
        if normalized.isEmpty || normalized == "/" { return DeepLinkDestination(tab: .home, more: nil, mapPinId: nil) }
        if normalized.hasPrefix("/app-review-demo") {
            return DeepLinkDestination(tab: .chat, more: nil, mapPinId: nil)
        }
        if normalized.hasPrefix("/schedule") { return DeepLinkDestination(tab: .schedule, more: nil, mapPinId: nil) }
        if normalized.hasPrefix("/live-updates") || normalized.hasPrefix("/updates") {
            return DeepLinkDestination(tab: .schedule, more: nil, mapPinId: nil)
        }
        if normalized.hasPrefix("/chat") { return DeepLinkDestination(tab: .chat, more: nil, mapPinId: nil) }
        if normalized.hasPrefix("/directory") {
            return DeepLinkDestination(tab: .directory, more: nil, mapPinId: nil)
        }
        if normalized.hasPrefix("/map") {
            return DeepLinkDestination(tab: .more, more: .map, mapPinId: mapPinId)
        }
        if normalized.hasPrefix("/account") {
            return DeepLinkDestination(tab: .more, more: .account, mapPinId: nil)
        }
        if normalized.hasPrefix("/notifications") {
            return DeepLinkDestination(tab: .more, more: .notifications, mapPinId: nil)
        }
        if normalized.hasPrefix("/bible-bowl") || normalized.hasPrefix("/biblebowl") {
            return DeepLinkDestination(tab: .more, more: .bibleBowl, mapPinId: nil)
        }
        if normalized.hasPrefix("/faq") { return DeepLinkDestination(tab: .more, more: .faq, mapPinId: nil) }
        if normalized.hasPrefix("/about") { return DeepLinkDestination(tab: .more, more: .about, mapPinId: nil) }
        if normalized.hasPrefix("/registration") || normalized.hasPrefix("/check-in") {
            return DeepLinkDestination(tab: .home, more: nil, mapPinId: nil)
        }
        if normalized.hasPrefix("/more") { return DeepLinkDestination(tab: .more, more: nil, mapPinId: nil) }
        return nil
    }

    private static func post(_ destination: DeepLinkDestination) {
        var userInfo: [String: Any] = ["tab": destination.tab]
        if let more = destination.more {
            userInfo["more"] = more.rawValue
        }
        if let mapPinId = destination.mapPinId {
            userInfo["mapPinId"] = mapPinId
        }
        NotificationCenter.default.post(
            name: .rendezvousDeepLink,
            object: nil,
            userInfo: userInfo
        )
    }
}
