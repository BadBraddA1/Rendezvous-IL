import SwiftUI

/// Shared now/next block for Home and Updates tabs.
struct RetreatNowNextSection: View {
    let result: NowNextResult
    var emptyMessage: String = "Live now/next appears during retreat week (Central Time)."
    var onOpenSchedule: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let current = result.current {
                RetreatStatusCard(
                    label: "Happening now",
                    title: current.title,
                    subtitle: [current.time, current.location].compactMap { $0 }.joined(separator: " · "),
                    tint: BrandColors.lake
                )
            }

            if let next = result.next {
                RetreatStatusCard(
                    label: result.current == nil ? "Up next" : "Then",
                    title: next.title,
                    subtitle: [next.day, next.time, next.location].compactMap { $0 }.joined(separator: " · "),
                    tint: BrandColors.coral
                )
            }

            if result.current == nil && result.next == nil {
                Text(emptyMessage)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
            }

            if let onOpenSchedule, result.current != nil || result.next != nil {
                Button("Open schedule", action: onOpenSchedule)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(BrandColors.lake)
            }
        }
    }
}

struct RetreatStatusCard: View {
    let label: String
    let title: String
    let subtitle: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased())
                .font(.caption.weight(.bold))
                .foregroundStyle(tint)
            Text(title)
                .font(.title3.weight(.semibold))
            if !subtitle.isEmpty {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(tint.opacity(0.2), lineWidth: 1)
        )
    }
}
