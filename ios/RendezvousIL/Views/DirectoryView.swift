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
        .refreshable {
            await loadEnabledYears(forceNetwork: true)
            await loadDirectory(forceNetwork: true)
        }
        .task {
            // Show disk cache immediately even before the session token is ready.
            hydrateFromCache()
            await loadEnabledYears(forceNetwork: false)
            if !enabledYears.isEmpty {
                await loadDirectory(forceNetwork: false)
            }
        }
        .onChange(of: session.isSignedIn) { _, signedIn in
            guard signedIn else { return }
            Task {
                await loadEnabledYears(forceNetwork: false)
                if !enabledYears.isEmpty {
                    await loadDirectory(forceNetwork: false)
                }
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
                            Text(YearFormatting.rendezvousTitle(enabledYear)).tag(enabledYear)
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
                            Button("Try \(YearFormatting.rendezvousTitle(alternateYear))") {
                                year = alternateYear
                                Task { await loadDirectory(forceNetwork: false) }
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                } else if filteredFamilies.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "person.3.fill")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text(search.isEmpty ? "No families listed for \(YearFormatting.label(year)) yet." : "No families match your search.")
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
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

    private func hydrateFromCache() {
        if let cached = DirectoryDataStore.loadYears(), !cached.isEmpty {
            enabledYears = cached
            if !cached.contains(year) {
                year = cached[0]
            }
        }
        if let cachedFamilies = DirectoryDataStore.loadFamilies(year: year), !cachedFamilies.isEmpty {
            families = cachedFamilies
            errorMessage = nil
            isLoading = false
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

        let cached = DirectoryDataStore.loadFamilies(year: year) ?? []
        if !forceNetwork, !cached.isEmpty {
            families = cached
            errorMessage = nil
            isLoading = false
            if session.apiClient != nil {
                await refreshDirectoryInBackground()
            }
            return
        }

        guard session.apiClient != nil else { return }

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
                            "No registration for \(YearFormatting.rendezvousTitle(year)) is linked to \(status.email ?? "this account")."
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
                    if family.structuredMembers.isEmpty {
                        parentsLine
                    }
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

                if !family.structuredMembers.isEmpty {
                    detailSection(title: "Family members") {
                        ForEach(family.structuredMembers.filter { $0.role != "child" }) { member in
                            VStack(alignment: .leading, spacing: 4) {
                                Text("\(member.role == "father" ? "Father" : "Mother"): \(member.name)")
                                    .font(.subheadline.weight(.medium))
                                ForEach(phones(forMemberName: member.name), id: \.phone) { contact in
                                    DirectoryPhoneActions(contact: contact, showName: false)
                                        .padding(.leading, 12)
                                }
                            }
                        }
                        let kids = family.structuredMembers.filter { $0.role == "child" }
                        if !kids.isEmpty {
                            Text(
                                "Kids: " + kids.map { kid in
                                    if let label = kid.ageLabel {
                                        return "\(kid.name) (\(label))"
                                    }
                                    return kid.name
                                }.joined(separator: ", ")
                            )
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            ForEach(kids.filter { phones(forMemberName: $0.name).isEmpty == false }) { kid in
                                ForEach(phones(forMemberName: kid.name), id: \.phone) { contact in
                                    DirectoryPhoneActions(contact: contact, showName: true)
                                }
                            }
                        }
                    }
                } else if !family.member_names.isEmpty {
                    detailSection(title: "Family members") {
                        ForEach(family.member_names, id: \.self) { name in
                            VStack(alignment: .leading, spacing: 4) {
                                Label(name, systemImage: "person")
                                    .font(.subheadline)
                                ForEach(phones(forMemberName: name), id: \.phone) { contact in
                                    DirectoryPhoneActions(contact: contact, showName: false)
                                        .padding(.leading, 28)
                                }
                            }
                        }
                    }
                }

                detailSection(title: "Contact") {
                    if let location = family.displayLocation {
                        mapsLink(label: location, query: family.formatted_address ?? location)
                    }
                    if let email = family.email, !email.isEmpty, let url = URL(string: "mailto:\(email)") {
                        Link(destination: url) {
                            Label(email, systemImage: "envelope")
                                .font(.subheadline)
                        }
                    }
                    if let address = family.formatted_address, !address.isEmpty,
                       address != family.displayLocation {
                        mapsLink(label: address, query: address)
                    }
                    let orphanPhones = family.contact_phones.filter { contact in
                        contact.name.isEmpty || !family.member_names.contains(where: {
                            Self.contact(contact, matchesMemberName: $0)
                        })
                    }
                    ForEach(Array(orphanPhones.enumerated()), id: \.offset) { _, contact in
                        DirectoryPhoneActions(contact: contact, showName: true)
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

    private func phones(forMemberName name: String) -> [DirectoryContactPhone] {
        family.contact_phones.filter { contact in
            Self.contact(contact, matchesMemberName: name)
        }
    }

    private static func contact(_ contact: DirectoryContactPhone, matchesMemberName name: String) -> Bool {
        let contactName = contact.name.trimmingCharacters(in: .whitespacesAndNewlines)
        let memberName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !contactName.isEmpty, !memberName.isEmpty else { return false }
        if contactName.caseInsensitiveCompare(memberName) == .orderedSame { return true }
        let contactFirst = contactName.split(separator: " ").first.map(String.init) ?? contactName
        return contactFirst.caseInsensitiveCompare(memberName) == .orderedSame
            || contactName.localizedCaseInsensitiveContains(memberName)
    }

    @ViewBuilder
    private func mapsLink(label: String, query: String) -> some View {
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        if let url = URL(string: "http://maps.apple.com/?q=\(encoded)") {
            Link(destination: url) {
                Label(label, systemImage: "map")
                    .font(.subheadline)
            }
        } else {
            Label(label, systemImage: "mappin.and.ellipse")
                .font(.subheadline)
        }
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

/// Name on top (if present), phone underneath, Call / Text actions.
private struct DirectoryPhoneActions: View {
    let contact: DirectoryContactPhone
    var showName: Bool = true

    private var digits: String {
        contact.phone.filter { $0.isNumber || $0 == "+" }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if showName, !contact.name.isEmpty {
                Text(contact.name)
                    .font(.subheadline.weight(.medium))
            }
            Text(contact.phone)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            if !digits.isEmpty {
                HStack(spacing: 16) {
                    if let tel = URL(string: "tel:\(digits)") {
                        Link("Call", destination: tel)
                            .font(.subheadline.weight(.semibold))
                    }
                    if let sms = URL(string: "sms:\(digits)") {
                        Link("Text", destination: sms)
                            .font(.subheadline.weight(.semibold))
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview {
    NavigationStack {
        DirectoryView()
            .environment(AppSession())
    }
}
