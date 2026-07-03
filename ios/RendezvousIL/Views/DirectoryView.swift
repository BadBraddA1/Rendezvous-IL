import SwiftUI

struct DirectoryView: View {
    @Environment(AppSession.self) private var session

    @State private var enabledYears: [Int] = [2026]
    @State private var year = 2026
    @State private var families: [DirectoryFamily] = []
    @State private var search = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    private var filteredFamilies: [DirectoryFamily] {
        let query = search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let base = families.sorted { $0.family_last_name.localizedCaseInsensitiveCompare($1.family_last_name) == .orderedAscending }
        guard !query.isEmpty else { return base }
        return base.filter { family in
            let haystack = [
                family.family_last_name,
                family.home_congregation,
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
            await loadEnabledYears()
            await loadDirectory()
        }
        .task {
            await loadEnabledYears()
            if !enabledYears.isEmpty {
                await loadDirectory()
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
                        Task { await loadDirectory() }
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

                if isLoading {
                    ProgressView("Loading directory…")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                } else if let errorMessage {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(errorMessage)
                            .foregroundStyle(.secondary)
                        Button("Try again") {
                            Task { await loadDirectory() }
                        }
                        .buttonStyle(.bordered)
                        if let alternateYear = enabledYears.first(where: { $0 != year }) {
                            Button("Try Rendezvous \(String(alternateYear))") {
                                year = alternateYear
                                Task { await loadDirectory() }
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
                    Text("\(filteredFamilies.count) families")
                        .font(.footnote)
                        .foregroundStyle(.secondary)

                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: 16)], spacing: 16) {
                        ForEach(filteredFamilies) { family in
                            DirectoryFamilyCard(family: family)
                        }
                    }
                }
            }
            .padding()
        }
    }

    private func loadEnabledYears() async {
        guard let client = session.apiClient else {
            enabledYears = [AppConfig.eventYear]
            year = AppConfig.eventYear
            return
        }

        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.getDirectoryYears()
            }
            let years = response.years.isEmpty ? [AppConfig.eventYear] : response.years
            enabledYears = years
            if !years.contains(year) {
                year = years[0]
            }
        } catch {
            enabledYears = [AppConfig.eventYear]
            year = AppConfig.eventYear
        }
    }

    private func loadDirectory() async {
        guard let client = session.apiClient else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.getDirectory(year: year)
            }
            families = response.families
        } catch APIError.unauthorized {
            families = []
            errorMessage = "You need a registration for Rendezvous \(String(year)) to view the directory."
        } catch {
            families = []
            errorMessage = error.localizedDescription
        }
    }
}

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
            Group {
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
            .frame(height: 140)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            Text("\(family.family_last_name) Family")
                .font(.headline)
                .lineLimit(2)

            if let congregation = family.home_congregation, !congregation.isEmpty {
                Label(congregation, systemImage: "building.2")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }

            if let email = family.email, !email.isEmpty, let url = URL(string: "mailto:\(email)") {
                Link(destination: url) {
                    Label(email, systemImage: "envelope")
                        .font(.caption)
                        .lineLimit(2)
                }
            }

            if let address = family.formatted_address, !address.isEmpty {
                Label(address, systemImage: "mappin.and.ellipse")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }

            ForEach(Array(family.contact_phones.enumerated()), id: \.offset) { _, contact in
                let digits = contact.phone.filter { $0.isNumber || $0 == "+" }
                if !digits.isEmpty, let url = URL(string: "tel:\(digits)") {
                    Link(destination: url) {
                        Label(
                            contact.name.isEmpty ? contact.phone : "\(contact.name): \(contact.phone)",
                            systemImage: "phone"
                        )
                        .font(.caption)
                        .lineLimit(2)
                    }
                }
            }

            Text("\(family.member_count) attendee\(family.member_count == 1 ? "" : "s")")
                .font(.caption)
                .foregroundStyle(.secondary)

            if let blurb = family.directory_blurb, !blurb.isEmpty {
                Text(blurb)
                    .font(.caption)
                    .foregroundStyle(.primary)
                    .padding(8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 8))
            }
        }
        .padding(12)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    NavigationStack {
        DirectoryView()
            .environment(AppSession())
    }
}
