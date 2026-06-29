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
        guard !query.isEmpty else { return families }
        return families.filter { family in
            let haystack = [
                family.family_last_name,
                family.home_congregation,
                family.directory_blurb,
                family.husband_first_name,
                family.wife_first_name,
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
            if !session.isSignedIn {
                signedOutState
            } else if enabledYears.isEmpty {
                emptyDirectoryState
            } else {
                directoryContent
            }
        }
        .navigationTitle("Family Directory")
        .task {
            await session.refreshAuth()
            await loadEnabledYears()
            if session.isSignedIn, !enabledYears.isEmpty {
                await loadDirectory()
            }
        }
    }

    private var signedOutState: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Sign in to browse the family directory")
                .font(.title3.weight(.semibold))
            Text("Registered Rendezvous families can share a photo and short note so other attendees can get to know them.")
                .foregroundStyle(.secondary)
            AuthView()
                .frame(minHeight: 360)
        }
        .padding()
    }

    private var emptyDirectoryState: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Directory not available")
                .font(.title3.weight(.semibold))
            Text("The family directory is not open for any event year yet.")
                .foregroundStyle(.secondary)
        }
        .padding()
    }

    private var directoryContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if enabledYears.count > 1 {
                    Picker("Event year", selection: $year) {
                        ForEach(enabledYears, id: \.self) { enabledYear in
                            Text("Rendezvous \(enabledYear)").tag(enabledYear)
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
                }
                .padding(12)
                .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))

                if isLoading {
                    ProgressView("Loading directory...")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                } else if let errorMessage {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(errorMessage)
                            .foregroundStyle(.secondary)
                        if let alternateYear = enabledYears.first(where: { $0 != year }) {
                            Button("Try Rendezvous \(alternateYear)") {
                                year = alternateYear
                                Task { await loadDirectory() }
                            }
                            .buttonStyle(.bordered)
                        }
                        NavigationLink("Manage your family photo") {
                            FamilyDirectoryManageView()
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                } else if filteredFamilies.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "person.3.fill")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text("No families listed for \(year) yet.")
                            .foregroundStyle(.secondary)
                        NavigationLink("Add your family photo") {
                            FamilyDirectoryManageView()
                        }
                        .buttonStyle(.borderedProminent)
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
            enabledYears = [2026]
            year = 2026
            return
        }

        do {
            let response = try await client.getDirectoryYears()
            let years = response.years.isEmpty ? [2026] : response.years
            enabledYears = years
            if !years.contains(year) {
                year = years[0]
            }
        } catch {
            enabledYears = [2026]
            year = 2026
        }
    }

    private func loadDirectory() async {
        guard let client = session.apiClient else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let response = try await client.getDirectory(year: year)
            families = response.families
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
                    .lineLimit(2)
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
