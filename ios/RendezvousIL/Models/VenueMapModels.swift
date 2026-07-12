import CoreLocation
import Foundation

/// Bundled Lake Williamson campus map (same pins as the website schedule map).
/// `latitude` / `longitude` on pins are reserved for a future blue-dot overlay.
struct VenueMapCatalog: Codable, Sendable {
    let imageAspectWidthOverHeight: Double
    let venue: VenueGeo
    let locations: [VenueMapPin]

    struct VenueGeo: Codable, Sendable {
        let name: String
        let address: String
        let latitude: Double
        let longitude: Double
        let campusRadiusMeters: Double

        var coordinate: CLLocationCoordinate2D {
            CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        }

        var location: CLLocation {
            CLLocation(latitude: latitude, longitude: longitude)
        }
    }
}

struct VenueMapPin: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let description: String
    /// Percent from left (0–100) on the campus image.
    let x: Double
    /// Percent from top (0–100) on the campus image.
    let y: Double
    let category: String
    let color: String?
    /// Optional GPS for a future “you are here” overlay (option 1).
    let latitude: Double?
    let longitude: Double?
}

enum VenueMapStore {
    static let shared: VenueMapCatalog = load()

    private static func load() -> VenueMapCatalog {
        guard let url = Bundle.main.url(forResource: "venue-map", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let catalog = try? JSONDecoder().decode(VenueMapCatalog.self, from: data)
        else {
            assertionFailure("venue-map.json missing from app bundle")
            return VenueMapCatalog(
                imageAspectWidthOverHeight: 1.34,
                venue: .init(
                    name: "Lake Williamson Christian Center",
                    address: "17080 IL Route 4, Carlinville, IL 62626",
                    latitude: 39.3142,
                    longitude: -89.8818,
                    campusRadiusMeters: 1200
                ),
                locations: []
            )
        }
        return catalog
    }

    /// Match schedule location text to a campus pin (mirrors web heuristics).
    static func pin(matchingLocationText text: String?) -> VenueMapPin? {
        guard let text, !text.isEmpty else { return nil }
        let haystack = text.lowercased()
        let patterns: [(String, String)] = [
            ("activities-center", "activity center"),
            ("activities-center", "ac room"),
            ("activities-center", "ac ping pong"),
            ("activities-center", "pool"),
            ("lakeside-dining", "lakeside dining"),
            ("bonfire-site", "bonfire"),
            ("archery", "archery"),
            ("human-foosball", "human foosball"),
            ("disc-golf", "disc golf"),
            ("rec-field-kickball", "rec field"),
            ("rec-field-kickball", "kickball"),
            ("rec-field-kickball", "capture the flag"),
            ("location-1776272179875", "motel"),
            ("location-1776272356027", "rv"),
            ("location-1776272356027", "tent"),
        ]
        for (id, needle) in patterns {
            if haystack.contains(needle), let pin = shared.locations.first(where: { $0.id == id }) {
                return pin
            }
        }
        return shared.locations.first { pin in
            haystack.contains(pin.name.lowercased())
        }
    }

    static func pin(id: String?) -> VenueMapPin? {
        guard let id else { return nil }
        return shared.locations.first { $0.id == id }
    }
}
