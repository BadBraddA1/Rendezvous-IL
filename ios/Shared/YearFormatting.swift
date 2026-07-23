import Foundation

/// Event-year display helpers.
///
/// SwiftUI `Text("\(2027)")` / `Text("… \(year)")` uses `LocalizedStringKey`, which
/// applies locale grouping → **"2,027"**. Always format years through here (or
/// `String(year)`) before putting them in UI copy.
enum YearFormatting {
    /// Plain digits only — never `"2,027"`.
    static func label(_ year: Int) -> String { String(year) }

    /// `"Rendezvous 2027"` style titles.
    static func rendezvousTitle(_ year: Int) -> String {
        "Rendezvous \(label(year))"
    }
}
