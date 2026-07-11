import Foundation
import MapKit
import UIKit

/// CarPlay bridge — today's Rendezvous schedule + directions to Lake Williamson.
@MainActor
enum CarPlayDataProvider {
    /// Lake Williamson Christian Center (Carlinville, IL).
    static let venueCoordinate = CLLocationCoordinate2D(latitude: 39.3142, longitude: -89.8818)
    static let venueName = "Lake Williamson Christian Center"
    static let venueAddress = "17080 IL Route 4, Carlinville, IL 62626"

    struct TodayItem: Identifiable {
        let id: String
        let title: String
        let detail: String
        let locationText: String?
    }

    static func loadTodayItems() -> [TodayItem] {
        let items = scheduleItems()
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Chicago")!
        let components = calendar.dateComponents([.year, .month, .day], from: Date())
        guard let year = components.year, let month = components.month, let day = components.day else {
            return []
        }
        let todayISO = String(format: "%04d-%02d-%02d", year, month, day)

        let todays = items.filter { $0.date == todayISO }
        if !todays.isEmpty {
            return todays.map(makeItem)
        }

        // Outside event week: show the next few upcoming items as a preview.
        let upcoming = items.filter { $0.date >= todayISO }.prefix(6)
        return upcoming.map(makeItem)
    }

    static func openDirectionsToVenue() {
        let placemark = MKPlacemark(coordinate: venueCoordinate)
        let mapItem = MKMapItem(placemark: placemark)
        mapItem.name = venueName
        mapItem.openInMaps(launchOptions: [
            MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving,
        ])
    }

    static func openDirections(for item: TodayItem) {
        if let location = item.locationText, !location.isEmpty {
            let query = "\(location), \(venueAddress)"
            if let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
               let url = URL(string: "http://maps.apple.com/?daddr=\(encoded)")
            {
                UIApplication.shared.open(url)
                return
            }
        }
        openDirectionsToVenue()
    }

    private static func scheduleItems() -> [LUScheduleItem] {
        if let snapshot = SharedScheduleStore.load(), !snapshot.luItems.isEmpty {
            return snapshot.luItems
        }
        if let offline = ScheduleDataStore.bestOfflineSchedule() {
            return offline.schedule.luItems
        }
        return []
    }

    private static func makeItem(_ event: LUScheduleItem) -> TodayItem {
        let time = formatClock(hour: event.startHour, minute: event.startMinute)
        var detail = time
        if let location = event.location, !location.isEmpty {
            detail = "\(time) · \(location)"
        }
        if event.date != todayISOString() {
            detail = "\(event.day) \(detail)"
        }
        return TodayItem(
            id: event.id,
            title: event.title,
            detail: detail,
            locationText: event.location
        )
    }

    private static func formatClock(hour: Int, minute: Int) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Chicago")!
        var components = DateComponents()
        components.hour = hour
        components.minute = minute
        guard let date = calendar.date(from: components) else {
            return String(format: "%d:%02d", hour, minute)
        }
        return date.formatted(date: .omitted, time: .shortened)
    }

    private static func todayISOString() -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Chicago")!
        let components = calendar.dateComponents([.year, .month, .day], from: Date())
        guard let year = components.year, let month = components.month, let day = components.day else {
            return ""
        }
        return String(format: "%04d-%02d-%02d", year, month, day)
    }
}
