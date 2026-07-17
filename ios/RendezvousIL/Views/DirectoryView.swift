import SwiftUI

struct DirectoryView: View {
    @Environment(AppSession.self) private var session

    @State private var enabledYears: [Int] = [2026]
    @State private var year = 2026
    @State private var families: [DirectoryFamily] = []
    @State private var search = ""
    @State private var isLoading = false
    @State private var isRefreshing = false
    @State private var errorMessage: String?

    private var filteredFamilies: [DirectoryFamily] {
        let query = search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let base = families.sorted {
            $0.family_last_name.localizedCaseInsensitiveCompare($1.family_last_name) == .orderedAscending
        }
        guard !query.isEmpty else { return base }
        return base.filter { family in
            let haystack = [
                family.family_last_name,
                family.city_state,
                family.city,
                family.state,
                family.directory_blurb,
                family.husband_first_name,
                family.wife_first_name,
                family.email,
                family.formatted_address,
                family.contact_phones.map { "\($0.name) \($0.phone)" }.joined(separator: " "),
                family.member_names.joined(separator: " "),
            ]
            .compactMap { $0 }
            .joined(separator: " ")
            .lowercased()
            return haystack.contains(query)
        }
    }

    var body: some View {
        Group {
            if enabledYears.isEmpty {
                emptyDirectoryState
            } else {
                directoryContent
            }
        }
        .navigationTitle("Family Directory")
        .navigationDestination(for: DirectoryFamily.self) { family in
            DirectoryFamilyDetailView(family: family)
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink {
                    FamilyDirectoryManageView()
                } label: {
                    Label("Your photo", systemImage: "camera.fill")
                }
            }
        }
        .refreshable {
            await loadEnabledYears(forceNetwork: true)
            await loadDirectory(forceNetwork: true)
        }
        .task {
            await loadEnabledYears(forceNetwork: false)
            if !enabledYears.isEmpty {
                await loadDirectory(forceNetwork: false)
            }
        }
    }

    private var emptyDirectoryState: some View {
        ContentUnavailableView {
            Label("Directory not open", systemImage: "person.3")
        } description: {
            Text("The family directory is not available for any event year yet.")
        }
    }

    private var directoryContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if enabledYears.count > 1 {
                    Picker("Event year", selection: $year) {
                        ForEach(enabledYears, id: \.self) { enabledYear in
                            Text("Rendezvous \(String(enabledYear))").tag(enabledYear)
                        }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: year) { _, _ in
                        Task { await loadDirectory(forceNetwork: false) }
                    }
                }

                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    TextField("Search families", text: $search)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }
                .padding(12)
                .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))

                if isLoading && families.isEmpty {
                    ProgressView("Loading directory…")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                } else if let errorMessage, families.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(errorMessage)
                            .foregroundStyle(.secondary)
                        Button("Try again") {
                            Task { await loadDirectory(forceNetwork: true) }
                        }
                        .buttonStyle(.bordered)
                        if let alternateYear = enabledYears.first(where: { $0 != year }) {
                            Button("Try Rendezvous \(String(alternateYear))") {
                                year = alternateYear
                                Task { await loadDirectory(forceNetwork: false) }
                            }
                            .buttonStyle(.bordered)
                        }
                        NavigationLink("Manage your family photo") {
                            FamilyDirectoryManageView()
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(BrandColors.lake)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                } else if filteredFamilies.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "person.3.fill")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text(search.isEmpty ? "No families listed for \(String(year)) yet." : "No families match your search.")
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                        NavigationLink("Add your family photo") {
                            FamilyDirectoryManageView()
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(BrandColors.lake)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                } else {
                    HStack {
                        Text("\(filteredFamilies.count) families")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        if isRefreshing {
                            ProgressView()
                                .controlSize(.mini)
                        }
                        Spacer()
                        Text("Tap a card for details")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }

                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: 16)], spacing: 16) {
                        ForEach(filteredFamilies) { family in
                            NavigationLink(value: family) {
                                DirectoryFamilyCard(family: family)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding()
        }
    }

    private func loadEnabledYears(forceNetwork: Bool) async {
        if !forceNetwork, let cached = DirectoryDataStore.loadYears(), !cached.isEmpty {
            enabledYears = cached
            if !cached.contains(year) {
                year = cached[0]
            }
        }

        if session.isAppStoreScreenshotMode {
            enabledYears = [AppConfig.eventYear]
            year = AppConfig.eventYear
            return
        }

        guard let client = session.apiClient else {
            if enabledYears.isEmpty {
                enabledYears = [AppConfig.eventYear]
                year = AppConfig.eventYear
            }
            return
        }

        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.getDirectoryYears()
            }
            let years = response.years.isEmpty ? [AppConfig.eventYear] : response.years
            enabledYears = years
            DirectoryDataStore.saveYears(years)
            if !years.contains(year) {
                year = years[0]
            }
        } catch {
            if enabledYears.isEmpty {
                enabledYears = [AppConfig.eventYear]
                year = AppConfig.eventYear
            }
        }
    }

    /// Show disk cache immediately, then refresh from the network in the background.
    private func loadDirectory(forceNetwork: Bool) async {
        if session.isAppStoreScreenshotMode {
            families = AppStoreScreenshotMode.sampleFamilies
            errorMessage = nil
            isLoading = false
            return
        }

        guard session.apiClient != nil else { return }

        let cached = DirectoryDataStore.loadFamilies(year: year) ?? []
        if !forceNetwork, !cached.isEmpty {
            families = cached
            errorMessage = nil
            isLoading = false
            await refreshDirectoryInBackground()
            return
        }

        if families.isEmpty {
            isLoading = true
        }
        errorMessage = nil
        defer { isLoading = false }

        await refreshDirectoryInBackground(showErrorsWhenEmpty: true)
    }

    private func refreshDirectoryInBackground(showErrorsWhenEmpty: Bool = false) async {
        guard let client = session.apiClient else { return }
        isRefreshing = true
        defer { isRefreshing = false }

        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.getDirectory(year: year)
            }
            families = response.families
            DirectoryDataStore.saveFamilies(response.families, year: year)
            errorMessage = nil
        } catch APIError.unauthorized {
            if families.isEmpty || showErrorsWhenEmpty {
                families = []
                errorMessage = "Session expired. Sign out and sign in again."
            }
        } catch {
            if APIError.isCancellation(error) { return }
            if families.isEmpty || showErrorsWhenEmpty {
                families = []
                errorMessage = error.localizedDescription
                if let status = try? await client.fetchMobileStatus() {
                    if status.hasFamilyProfile == false {
                        errorMessage =
                            "\(error.localizedDescription) Open Family account on the website once to link your registration."
                    } else if status.isAdmin != true,
                              status.directoryAccess?[String(year)] == false {
                        errorMessage =
                            "No registration for Rendezvous \(String(year)) is linked to \(status.email ?? "this account")."
                    }
                }
            }
        }
    }
}

/// Compact grid card — full details open on tap.
private struct DirectoryFamilyCard: View {
    let family: DirectoryFamily

    private var directoryPhotoPlaceholder: some View {
        Color(.secondarySystemGroupedBackground)
            .overlay {
                VStack(spacing: 8) {
                    Image(systemName: "person.3.fill")
                        .font(.title2)
                        .foregroundStyle(.secondary)
                    Text("No photo yet")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Overlay + clip keeps huge camera uploads from expanding the card
            // before AsyncImage finishes laying out.
            Color.clear
                .aspectRatio(4 / 3, contentMode: .fit)
                .overlay {
                    if let photoUrl = family.photo_url, !photoUrl.isEmpty, let url = URL(string: photoUrl) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .scaledToFill()
                            case .failure, .empty:
                                directoryPhotoPlaceholder
                            @unknown default:
                                directoryPhotoPlaceholder
                            }
                        }
                    } else {
                        directoryPhotoPlaceholder
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .contentShape(RoundedRectangle(cornerRadius: 12))

            Text("\(family.family_last_name) Family")
                .font(.headline)
                .foregroundStyle(.primary)
                .lineLimit(2)

            if let location = family.displayLocation {
                Label(location, systemImage: "mappin.and.ellipse")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            Text("\(family.member_count) attendee\(family.member_count == 1 ? "" : "s")")
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack(spacing: 4) {
                Text("View details")
                    .font(.caption2.weight(.semibold))
                Image(systemName: "chevron.right")
                    .font(.caption2.weight(.semibold))
            }
            .foregroundStyle(BrandColors.lake)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
    }
}

struct DirectoryFamilyDetailView: View {
    let family: DirectoryFamily

    private var directoryPhotoPlaceholder: some View {
        Color(.secondarySystemGroupedBackground)
            .overlay {
                Image(systemName: "person.3.fill")
                    .font(.largeTitle)
                    .foregroundStyle(.secondary)
            }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                photo

                VStack(alignment: .leading, spacing: 6) {
                    Text("\(family.family_last_name) Family")
                        .font(.title2.weight(.semibold))
                    parentsLine
                    Text("\(family.member_count) attendee\(family.member_count == 1 ? "" : "s")")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                if let blurb = family.directory_blurb, !blurb.isEmpty {
                    Text(blurb)
                        .font(.body)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(BrandColors.lakeLight.opacity(0.6), in: RoundedRectangle(cornerRadius: 12))
                }

                if !family.member_names.isEmpty {
                    detailSection(title: "Family members") {
                        ForEach(family.member_names, id: \.self) { name in
                            Label(name, systemImage: "person")
                                .font(.subheadline)
                        }
                    }
                }

                detailSection(title: "Contact") {
                    if let location = family.displayLocation {
                        Label(location, systemImage: "mappin.and.ellipse")
                            .font(.subheadline)
                    }
                    if let email = family.email, !email.isEmpty, let url = URL(string: "mailto:\(email)") {
                        Link(destination: url) {
                            Label(email, systemImage: "envelope")
                                .font(.subheadline)
                        }
                    }
                    if let address = family.formatted_address, !address.isEmpty,
                       address != family.displayLocation {
                        Label(address, systemImage: "house")
                            .font(.subheadline)
                            .foregroundStyle(.primary)
                    }
                    ForEach(Array(family.contact_phones.enumerated()), id: \.offset) { _, contact in
                        let digits = contact.phone.filter { $0.isNumber || $0 == "+" }
                        if !digits.isEmpty, let url = URL(string: "tel:\(digits)") {
                            Link(destination: url) {
                                Label(
                                    contact.name.isEmpty ? contact.phone : "\(contact.name): \(contact.phone)",
                                    systemImage: "phone"
                                )
                                .font(.subheadline)
                            }
                        } else if !contact.phone.isEmpty {
                            Label(
                                contact.name.isEmpty ? contact.phone : "\(contact.name): \(contact.phone)",
                                systemImage: "phone"
                            )
                            .font(.subheadline)
                        }
                    }
                }
            }
            .padding()
        }
        .navigationTitle(family.family_last_name)
        .navigationBarTitleDisplayMode(.inline)
    }

    private var photo: some View {
        Color.clear
            .aspectRatio(4 / 3, contentMode: .fit)
            .frame(maxHeight: 240)
            .overlay {
                if let photoUrl = family.photo_url, !photoUrl.isEmpty, let url = URL(string: photoUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                        case .failure, .empty:
                            directoryPhotoPlaceholder
                        @unknown default:
                            directoryPhotoPlaceholder
                        }
                    }
                } else {
                    directoryPhotoPlaceholder
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .contentShape(RoundedRectangle(cornerRadius: 16))
    }

    @ViewBuilder
    private var parentsLine: some View {
        let parents = [family.husband_first_name, family.wife_first_name]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        if !parents.isEmpty {
            Text(parents.joined(separator: " & "))
                .font(.title3)
                .foregroundStyle(.secondary)
        }
    }

    private func detailSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.headline)
            VStack(alignment: .leading, spacing: 10) {
                content()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14))
        }
    }
}

#Preview {
    NavigationStack {
        DirectoryView()
            .environment(AppSession())
    }
}
