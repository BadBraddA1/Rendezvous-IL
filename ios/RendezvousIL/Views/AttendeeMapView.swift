import MapKit
import SwiftUI

struct AttendeeMapView: View {
    @Environment(AppSession.self) private var session

    @State private var attendees: [MapAttendee] = []
    @State private var directoryById: [Int: DirectoryFamily] = [:]
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
                        selectedAttendeeCard(selected)
                    }
                }
            }
        }
        .navigationTitle("Attendee map")
        .task { await load() }
        .refreshable { await load() }
    }

    @ViewBuilder
    private func selectedAttendeeCard(_ selected: MapAttendee) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 12) {
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
                Spacer(minLength: 8)
                if let family = directoryFamily(for: selected) {
                    NavigationLink {
                        DirectoryFamilyDetailView(family: family)
                    } label: {
                        Text("View Full Profile")
                            .font(.subheadline.weight(.semibold))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(BrandColors.lake, in: Capsule())
                            .foregroundStyle(.white)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.ultraThinMaterial)
    }

    private func directoryFamily(for attendee: MapAttendee) -> DirectoryFamily? {
        if let familyId = attendee.familyId, let family = directoryById[familyId] {
            return family
        }
        return directoryById[attendee.id]
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
            let mapResponse = try await client.getMapAttendees()
            attendees = mapResponse.attendees

            let year = mapResponse.year
            if let directory = try? await client.getDirectory(year: year) {
                directoryById = Dictionary(
                    uniqueKeysWithValues: directory.families.map { ($0.id, $0) }
                )
            } else if let cached = DirectoryDataStore.loadFamilies(year: year) {
                directoryById = Dictionary(uniqueKeysWithValues: cached.map { ($0.id, $0) })
            }

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
