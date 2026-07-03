import ActivityKit
import SwiftUI
import WidgetKit

@main
struct RendezvousWidgetsBundle: WidgetBundle {
    var body: some Widget {
        NextEventWidget()
        NowNextWidget()
        if #available(iOS 16.1, *) {
            RendezvousLiveActivityWidget()
        }
    }
}

struct NextEventWidget: Widget {
    let kind = "NextEventWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RendezvousTimelineProvider()) { entry in
            NextEventWidgetView(entry: entry)
                .containerBackground(BrandWidgetColors.lakeLight, for: .widget)
                .widgetURL(URL(string: "rendezvousil://schedule")!)
        }
        .configurationDisplayName("Next event")
        .description("Shows the next Rendezvous activity.")
        .supportedFamilies([.systemSmall, .accessoryRectangular, .accessoryInline])
    }
}

struct NowNextWidget: Widget {
    let kind = "NowNextWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RendezvousTimelineProvider()) { entry in
            NowNextWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
                .widgetURL(URL(string: "rendezvousil://schedule")!)
        }
        .configurationDisplayName("Now & next")
        .description("Current and upcoming retreat activities.")
        .supportedFamilies([.systemMedium])
    }
}

struct RendezvousTimelineEntry: TimelineEntry {
    let date: Date
    let snapshot: SharedScheduleSnapshot?
    let nowNext: NowNextResult
}

struct RendezvousTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> RendezvousTimelineEntry {
        entry(for: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (RendezvousTimelineEntry) -> Void) {
        completion(entry(for: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RendezvousTimelineEntry>) -> Void) {
        let now = Date()
        let current = entry(for: now)
        let refresh = Calendar.current.date(byAdding: .minute, value: 15, to: now) ?? now.addingTimeInterval(900)
        completion(Timeline(entries: [current], policy: .after(refresh)))
    }

    private func entry(for date: Date) -> RendezvousTimelineEntry {
        let snapshot = SharedScheduleStore.load()
        let items = snapshot?.luItems ?? []
        let nowNext = ScheduleNowNext.evaluate(items: items, now: date)
        return RendezvousTimelineEntry(date: date, snapshot: snapshot, nowNext: nowNext)
    }
}

struct NextEventWidgetView: View {
    let entry: RendezvousTimelineEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryInline:
            Text(inlineText)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text("Rendezvous")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text(primaryTitle)
                    .font(.headline)
                    .lineLimit(2)
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        default:
            VStack(alignment: .leading, spacing: 6) {
                Text("Rendezvous \(String(entry.snapshot?.eventYear ?? 2027))")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(BrandWidgetColors.lake)
                Text(primaryTitle)
                    .font(.headline)
                    .lineLimit(3)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }

    private var primaryTitle: String {
        if let current = entry.nowNext.current?.title {
            return "Now: \(current)"
        }
        return entry.nowNext.next?.title ?? "Registration opens \(entry.snapshot?.registrationOpens ?? "Jan 1, 2027")"
    }

    private var subtitle: String {
        if let next = entry.nowNext.next {
            return [next.day, next.time].joined(separator: " · ")
        }
        return entry.snapshot?.dateRange ?? "May 3–7, 2027"
    }

    private var inlineText: String {
        if let current = entry.nowNext.current?.title {
            return "Now: \(current)"
        }
        if let next = entry.nowNext.next?.title {
            return "Next: \(next)"
        }
        return "Rendezvous 2027"
    }
}

struct NowNextWidgetView: View {
    let entry: RendezvousTimelineEntry

    var body: some View {
        HStack(spacing: 12) {
            column(
                label: "NOW",
                title: entry.nowNext.current?.title,
                detail: entry.nowNext.current?.time,
                tint: BrandWidgetColors.lake
            )
            Divider()
            column(
                label: "NEXT",
                title: entry.nowNext.next?.title,
                detail: [entry.nowNext.next?.day, entry.nowNext.next?.time]
                    .compactMap { $0 }
                    .joined(separator: " · "),
                tint: BrandWidgetColors.coral
            )
        }
        .padding(4)
    }

    private func column(label: String, title: String?, detail: String?, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption2.weight(.bold))
                .foregroundStyle(tint)
            Text(title ?? "—")
                .font(.subheadline.weight(.semibold))
                .lineLimit(2)
            Text(detail ?? " ")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
    }
}

enum BrandWidgetColors {
    static let lake = Color(red: 0.22, green: 0.55, blue: 0.52)
    static let coral = Color(red: 0.78, green: 0.45, blue: 0.32)
    static let lakeLight = Color(red: 0.88, green: 0.95, blue: 0.94)
}

@available(iOS 16.1, *)
struct RendezvousLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RendezvousActivityAttributes.self) { context in
            LiveActivityLockView(context: context)
                .activityBackgroundTint(BrandWidgetColors.lakeLight)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text("Rendezvous")
                        .font(.caption2)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.currentTitle ?? context.state.nextTitle ?? "Retreat")
                        .font(.headline)
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.countdownLabel ?? context.state.nextTime ?? "")
                        .font(.caption2)
                        .lineLimit(1)
                }
            } compactLeading: {
                Image(systemName: "calendar")
            } compactTrailing: {
                Text(context.state.countdownLabel ?? context.state.nextTime ?? "•••")
                    .font(.caption2)
                    .lineLimit(1)
            } minimal: {
                Image(systemName: "calendar")
            }
        }
    }
}

@available(iOS 16.1, *)
struct LiveActivityLockView: View {
    let context: ActivityViewContext<RendezvousActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Rendezvous \(context.attributes.eventYearLabel)")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(BrandWidgetColors.lake)
                Spacer()
                if let countdown = context.state.countdownLabel {
                    Text(countdown)
                        .font(.caption.weight(.bold))
                        .foregroundStyle(BrandWidgetColors.coral)
                }
            }
            if let current = context.state.currentTitle {
                Text("Now: \(current)")
                    .font(.headline)
                if let time = context.state.currentTime {
                    Text(time)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } else if let next = context.state.nextTitle {
                Text("Up next: \(next)")
                    .font(.headline)
                if let time = context.state.nextTime {
                    Text(time)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if let location = context.state.nextLocation, !location.isEmpty {
                    Text(location)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
    }
}
