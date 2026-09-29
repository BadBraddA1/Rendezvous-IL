import MapKit
import SwiftUI

struct AttendeeMapView: View {
    @Environment(AppSession.self) private var session

    @State private var attendees: [MapAttendee] = []
    @State private var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 39.8, longitude: -89.6),
            span: MKCoordinateSpan(latitudeDelta: 6, longitudeDelta: 6)
        )
    )
    @State private var loading = true
    @State private var error: String?
    @State private var selected: MapAttendee?

    var body: some View {
        Group {
            if loading && attendees.isEmpty {
                ProgressView("Loading map…")
            } else if let error, attendees.isEmpty {
                ContentUnavailableView(
                    "Map unavailable",
                    systemImage: "map",
                    description: Text(error)
                )
            } else {
                Map(position: $cameraPosition, selection: $selected) {
                    ForEach(attendees.filter { $0.lat != nil && $0.lng != nil }) { attendee in
                        Annotation(
                            attendee.lastName ?? "Family",
                            coordinate: CLLocationCoordinate2D(
                                latitude: attendee.lat ?? 0,
                                longitude: attendee.lng ?? 0
                            )
                        ) {
                            Image(systemName: "mappin.circle.fill")
                                .foregroundStyle(BrandColors.coral)
                                .font(.title2)
                        }
                        .tag(attendee)
                    }
                }
                .mapStyle(.standard(elevation: .realistic))
                .safeAreaInset(edge: .bottom) {
                    if let selected {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(selected.lastName ?? "Family") family")
                                .font(.headline)
                            if let cong = selected.homeCongregation, !cong.isEmpty {
                                Text(cong)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            if let address = selected.fullAddress, !address.isEmpty {
                                Text(address)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .background(.ultraThinMaterial)
                    }
                }
            }
        }
        .navigationTitle("Attendee map")
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        guard let client = session.apiClient else {
            error = "Sign in required"
            loading = false
            return
        }
        loading = true
        error = nil
        defer { loading = false }
        do {
            let response = try await client.getMapAttendees()
            attendees = response.attendees
            if let first = attendees.first(where: { $0.lat != nil && $0.lng != nil }),
               let lat = first.lat,
               let lng = first.lng {
                cameraPosition = .region(
                    MKCoordinateRegion(
                        center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                        span: MKCoordinateSpan(latitudeDelta: 4, longitudeDelta: 4)
                    )
                )
            }
        } catch {
            self.error = error.localizedDescription
        }
    }
}
