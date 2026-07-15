import Foundation

/// Live chat demo for App Review / TestFlight — uses **real** admin test channels.
///
/// Enable with launch arg:
///   `-ChatDemo`                  → uses code from Info.plist `CHAT_DEMO_CODE`
///   `-ChatDemo your-secret-code` → override code for this launch
///
/// Or UserDefaults: `ChatDemo=1` and optional `ChatDemoCode`.
///
/// Server must have matching `CHAT_DEMO_CODE`. Manage which rooms appear in
/// Admin → Year Chat (mark channels as **test**).
enum ChatDemoMode {
    private static let enabledKey = "ChatDemo"
    private static let codeKey = "ChatDemoCode"

    static var isEnabled: Bool {
        if ProcessInfo.processInfo.arguments.contains("-ChatDemo") { return true }
        return UserDefaults.standard.bool(forKey: enabledKey)
    }

    /// Code sent as `X-Chat-Demo-Code` (must match Vercel `CHAT_DEMO_CODE`).
    static var accessCode: String? {
        let args = ProcessInfo.processInfo.arguments
        if let index = args.firstIndex(of: "-ChatDemo") {
            let next = args.index(after: index)
            if next < args.endIndex {
                let value = args[next]
                if !value.hasPrefix("-"), !value.isEmpty {
                    return value
                }
            }
        }
        if let stored = UserDefaults.standard.string(forKey: codeKey)?.trimmingCharacters(in: .whitespacesAndNewlines),
           !stored.isEmpty {
            return stored
        }
        if let bundled = Bundle.main.object(forInfoDictionaryKey: "CHAT_DEMO_CODE") as? String {
            let trimmed = bundled.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty, !trimmed.hasPrefix("$(") {
                return trimmed
            }
        }
        return nil
    }
}
