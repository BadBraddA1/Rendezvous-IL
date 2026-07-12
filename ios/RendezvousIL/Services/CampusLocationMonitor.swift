import CoreLocation
import Foundation
import Observation

/// Coarse “are we at Lake Williamson?” check for switching MapKit ↔ campus image.
@MainActor
@Observable
final class CampusLocationMonitor: NSObject {
    private(set) var authorization: CLAuthorizationStatus
    private(set) var isOnCampus = false
    private(set) var distanceMeters: CLLocationDistance?
    private(set) var lastError: String?

    private let manager = CLLocationManager()
    private var isMonitoring = false

    override init() {
        authorization = manager.authorizationStatus
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        manager.distanceFilter = 50
    }

    func startIfNeeded() {
        authorization = manager.authorizationStatus
        switch authorization {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            beginUpdates()
        case .denied, .restricted:
            lastError = "Location is off — you can still browse the campus map."
        @unknown default:
            break
        }
    }

    func stop() {
        guard isMonitoring else { return }
        manager.stopUpdatingLocation()
        isMonitoring = false
    }

    private func beginUpdates() {
        guard !isMonitoring else { return }
        isMonitoring = true
        manager.startUpdatingLocation()
    }

    private func evaluate(_ location: CLLocation) {
        let venue = VenueMapStore.shared.venue.location
        let distance = location.distance(from: venue)
        distanceMeters = distance
        isOnCampus = distance <= VenueMapStore.shared.venue.campusRadiusMeters
    }
}

extension CampusLocationMonitor: CLLocationManagerDelegate {
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            authorization = manager.authorizationStatus
            switch authorization {
            case .authorizedWhenInUse, .authorizedAlways:
                beginUpdates()
            case .denied, .restricted:
                stop()
                isOnCampus = false
                lastError = "Location is off — you can still browse the campus map."
            default:
                break
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        Task { @MainActor in
            evaluate(location)
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            lastError = error.localizedDescription
        }
    }
}
