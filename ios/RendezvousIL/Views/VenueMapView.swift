import MapKit
import SwiftUI

/// Hybrid map: MapKit directions while traveling, image campus map on site.
struct VenueMapView: View {
    enum Mode: String, CaseIterable, Identifiable {
        case getThere = "Get there"
        case campus = "Campus map"
        var id: String { rawValue }
    }

    var initialPinId: String? = nil
    var preferCampus: Bool = false

    @State private var mode: Mode = .getThere
    @State private var highlightedPinId: String?
    @State private var didApplyInitialMode = false
    @State private var userPickedMode = false
    @State private var locationMonitor = CampusLocationMonitor()
    @State private var selectedPin: VenueMapPin?

    private var catalog: VenueMapCatalog { VenueMapStore.shared }

    var body: some View {
        VStack(spacing: 0) {
            Picker("Map mode", selection: Binding(
                get: { mode },
                set: { newValue in
                    userPickedMode = true
                    mode = newValue
                }
            )) {
                ForEach(Mode.allCases) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.vertical, 10)

            if locationMonitor.isOnCampus, mode == .getThere {
                onCampusBanner
            }

            Group {
                switch mode {
                case .getThere:
                    ApproachMapView(venue: catalog.venue) {
                        mode = .campus
                    }
                case .campus:
                    CampusImageMapView(
                        catalog: catalog,
                        highlightedPinId: highlightedPinId,
                        selectedPin: $selectedPin
                    )
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Map")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $selectedPin) { pin in
            PinDetailSheet(pin: pin)
                .presentationDetents([.medium])
        }
        .onAppear {
            locationMonitor.startIfNeeded()
            applyInitialSelectionIfNeeded()
        }
        .onDisappear {
            locationMonitor.stop()
        }
        .onChange(of: locationMonitor.isOnCampus) { _, onCampus in
            guard onCampus, !userPickedMode, mode == .getThere else { return }
            mode = .campus
        }
    }

    private var onCampusBanner: some View {
        Button {
            mode = .campus
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "figure.walk")
                Text("You’re at Lake Williamson — open the campus map")
                    .font(.subheadline.weight(.medium))
                    .multilineTextAlignment(.leading)
                Spacer(minLength: 0)
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
            }
            .foregroundStyle(BrandColors.lake)
            .padding(12)
            .background(BrandColors.lakeLight, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
        .padding(.horizontal)
        .padding(.bottom, 8)
    }

    private func applyInitialSelectionIfNeeded() {
        guard !didApplyInitialMode else { return }
        didApplyInitialMode = true
        if let initialPinId, let pin = VenueMapStore.pin(id: initialPinId) {
            mode = .campus
            highlightedPinId = pin.id
            selectedPin = pin
            return
        }
        if preferCampus || locationMonitor.isOnCampus {
            mode = .campus
        }
    }
}

// MARK: - Approach (MapKit)

private struct ApproachMapView: View {
    let venue: VenueMapCatalog.VenueGeo
    let openCampus: () -> Void

    @State private var position: MapCameraPosition

    init(venue: VenueMapCatalog.VenueGeo, openCampus: @escaping () -> Void) {
        self.venue = venue
        self.openCampus = openCampus
        _position = State(
            initialValue: .region(
                MKCoordinateRegion(
                    center: venue.coordinate,
                    span: MKCoordinateSpan(latitudeDelta: 0.08, longitudeDelta: 0.08)
                )
            )
        )
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Map(position: $position) {
                Marker(venue.name, coordinate: venue.coordinate)
                    .tint(BrandColors.lake)
            }
            .mapStyle(.standard(elevation: .realistic))
            .ignoresSafeArea(edges: .bottom)

            VStack(spacing: 10) {
                Text(venue.address)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                Button {
                    openDirections()
                } label: {
                    Label("Directions in Apple Maps", systemImage: "arrow.triangle.turn.up.right.diamond.fill")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(BrandColors.lake)

                Button("Browse campus map instead", action: openCampus)
                    .font(.subheadline.weight(.medium))
            }
            .padding(16)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .padding()
        }
    }

    private func openDirections() {
        let placemark = MKPlacemark(coordinate: venue.coordinate)
        let item = MKMapItem(placemark: placemark)
        item.name = venue.name
        item.openInMaps(launchOptions: [
            MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving,
        ])
    }
}

// MARK: - Campus image map

private struct CampusImageMapView: View {
    let catalog: VenueMapCatalog
    let highlightedPinId: String?
    @Binding var selectedPin: VenueMapPin?

    @State private var scale: CGFloat = 1
    @State private var offset: CGSize = .zero
    @State private var lastScale: CGFloat = 1
    @State private var lastOffset: CGSize = .zero

    var body: some View {
        GeometryReader { geo in
            let baseWidth = geo.size.width
            let baseHeight = baseWidth / catalog.imageAspectWidthOverHeight

            ZStack {
                Color(.systemGroupedBackground)

                ZStack(alignment: .topLeading) {
                    Image("VenueMap")
                        .resizable()
                        .scaledToFit()
                        .frame(width: baseWidth, height: baseHeight)

                    ForEach(catalog.locations) { pin in
                        Button {
                            selectedPin = pin
                        } label: {
                            Image(systemName: "mappin.circle.fill")
                                .font(.title2)
                                .symbolRenderingMode(.palette)
                                .foregroundStyle(.white, pinTint(pin))
                                .shadow(color: .black.opacity(0.35), radius: 2, y: 1)
                                .scaleEffect(highlightedPinId == pin.id ? 1.35 : 1)
                        }
                        .buttonStyle(.plain)
                        .position(
                            x: baseWidth * pin.x / 100,
                            y: baseHeight * pin.y / 100
                        )
                        .accessibilityLabel(pin.name)
                    }
                }
                .frame(width: baseWidth, height: baseHeight)
                .scaleEffect(scale)
                .offset(offset)
                .gesture(dragGesture)
                .gesture(magnifyGesture)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .clipped()
            .overlay(alignment: .topTrailing) {
                HStack(spacing: 8) {
                    zoomButton(systemName: "minus.magnifyingglass") {
                        scale = max(1, scale - 0.35)
                        lastScale = scale
                    }
                    zoomButton(systemName: "plus.magnifyingglass") {
                        scale = min(4, scale + 0.35)
                        lastScale = scale
                    }
                }
                .padding(12)
            }
            .overlay(alignment: .bottom) {
                Text("Pinch to zoom · tap a pin for details")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(.ultraThinMaterial, in: Capsule())
                    .padding(.bottom, 12)
            }
            .onAppear {
                if let highlightedPinId,
                   let pin = catalog.locations.first(where: { $0.id == highlightedPinId }) {
                    // Mild zoom toward highlighted pin
                    scale = 1.6
                    lastScale = scale
                    offset = CGSize(
                        width: (0.5 - pin.x / 100) * baseWidth * (scale - 1),
                        height: (0.5 - pin.y / 100) * baseHeight * (scale - 1)
                    )
                    lastOffset = offset
                }
            }
        }
    }

    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                offset = CGSize(
                    width: lastOffset.width + value.translation.width,
                    height: lastOffset.height + value.translation.height
                )
            }
            .onEnded { _ in
                lastOffset = offset
            }
    }

    private var magnifyGesture: some Gesture {
        MagnifyGesture()
            .onChanged { value in
                scale = min(4, max(1, lastScale * value.magnification))
            }
            .onEnded { _ in
                lastScale = scale
            }
    }

    private func zoomButton(systemName: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.body.weight(.semibold))
                .frame(width: 36, height: 36)
                .background(.ultraThinMaterial, in: Circle())
        }
        .buttonStyle(.plain)
    }

    private func pinTint(_ pin: VenueMapPin) -> Color {
        switch pin.color ?? pin.category {
        case "red", "meeting": return .red
        case "orange", "dining": return BrandColors.coral
        case "blue", "lodging": return BrandColors.lake
        case "purple", "recreation", "activities": return .purple
        case "green": return .green
        case "yellow": return .yellow
        case "pink": return .pink
        default: return BrandColors.lake
        }
    }
}

private struct PinDetailSheet: View {
    let pin: VenueMapPin

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 12) {
                Text(pin.name)
                    .font(.title2.weight(.semibold))
                Text(pin.category.capitalized)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(BrandColors.lake)
                if !pin.description.isEmpty {
                    Text(pin.description)
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
                Text("Blue-dot “you are here” on this campus image is planned for a later update.")
                    .font(.footnote)
                    .foregroundStyle(.tertiary)
                Spacer()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .navigationTitle("Campus spot")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    NavigationStack {
        VenueMapView()
    }
}
