import Foundation
import SwiftUI

/// Persists last successful network sync timestamps for offline-aware footers.
enum SyncStampStore {
    private static let prefix = "syncStamp."

    static func mark(_ key: String, at date: Date = Date()) {
        UserDefaults.standard.set(date.timeIntervalSince1970, forKey: prefix + key)
    }

    static func date(for key: String) -> Date? {
        let value = UserDefaults.standard.double(forKey: prefix + key)
        guard value > 0 else { return nil }
        return Date(timeIntervalSince1970: value)
    }

    static func label(for key: String, hasLocalData: Bool) -> String {
        if let date = date(for: key) {
            let formatter = RelativeDateTimeFormatter()
            formatter.unitsStyle = .short
            return "On this device · synced \(formatter.localizedString(for: date, relativeTo: Date()))"
        }
        if hasLocalData {
            return "On this device · not synced yet this session"
        }
        return "Nothing downloaded yet"
    }
}

struct SyncStatusFooter: View {
    let key: String
    let hasLocalData: Bool

    var body: some View {
        Text(SyncStampStore.label(for: key, hasLocalData: hasLocalData))
            .font(.caption2)
            .foregroundStyle(.tertiary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal)
            .padding(.vertical, 6)
    }
}
