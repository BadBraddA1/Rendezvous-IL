import SwiftUI
import Clerk

struct CheckInView: View {
    @Environment(AppSession.self) private var session

    @State private var code = ""
    @State private var searchQuery = ""
    @State private var searchResults: [CheckInRegistrationSummary] = []
    @State private var lookup: CheckInLookupResponse?
    @State private var roomKeys = ""
    @State private var tshirtsDistributed = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var successMessage: String?

    var body: some View {
        Group {
            if !session.isSignedIn {
                staffSignIn
            } else if !session.canCheckIn {
                accessDenied
            } else {
                checkInStation
            }
        }
        .navigationTitle("Check-In")
        .task {
            await session.refreshAuth()
        }
    }

    private var staffSignIn: some View {
        ScrollView {
            VStack(spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Staff check-in")
                        .font(.title2.weight(.semibold))
                    Text("Sign in with the same Rendezvous admin account used on the website. You need the Check-In role (or higher).")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                ClerkAuthPanel(
                    mode: .signIn,
                    sectionTitle: "Staff sign-in",
                    helperText: "Use your admin email from rendezvousil.com.",
                    buttonTitle: "Sign in"
                )

                Link(destination: AppConfig.url(for: "/admin/checkin")) {
                    Label("Open web check-in station", systemImage: "safari")
                }
                .font(.subheadline)
            }
            .padding(20)
        }
    }

    private var accessDenied: some View {
        VStack(alignment: .leading, spacing: 12) {
            Image(systemName: "lock.fill")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("Check-in access required")
                .font(.title3.weight(.semibold))
            Text("Your account is signed in but does not have check-in permissions. Ask an admin to assign the Check-In role in Admin → Users.")
                .foregroundStyle(.secondary)
            if let name = session.adminName {
                Text("Signed in as \(name)")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
    }

    private var checkInStation: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let name = session.adminName {
                    Text("Signed in as \(name)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                lookupSection
                searchSection

                if let lookup {
                    resultSection(lookup)
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.subheadline)
                        .foregroundStyle(.red)
                }

                if let successMessage {
                    Text(successMessage)
                        .font(.subheadline)
                        .foregroundStyle(.green)
                }
            }
            .padding()
        }
    }

    private var lookupSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("QR / check-in code")
                .font(.headline)

            HStack {
                TextField("Enter code", text: $code)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .textFieldStyle(.roundedBorder)

                Button("Look up") {
                    Task { await lookupByCode() }
                }
                .buttonStyle(.borderedProminent)
                .tint(BrandColors.lake)
                .disabled(code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isLoading)
            }
        }
    }

    private var searchSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Search by family name or email")
                .font(.headline)

            HStack {
                TextField("Smith", text: $searchQuery)
                    .textFieldStyle(.roundedBorder)

                Button("Search") {
                    Task { await searchFamilies() }
                }
                .buttonStyle(.bordered)
                .disabled(searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isLoading)
            }

            if !searchResults.isEmpty {
                VStack(spacing: 8) {
                    ForEach(searchResults) { result in
                        Button {
                            Task { await selectSearchResult(result) }
                        } label: {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text("\(result.family_last_name) Family")
                                        .font(.subheadline.weight(.semibold))
                                    if let email = result.email {
                                        Text(email)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                Spacer()
                                if result.checked_in == true {
                                    Text("Checked in")
                                        .font(.caption)
                                        .foregroundStyle(.green)
                                }
                            }
                            .padding(12)
                            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 10))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func resultSection(_ lookup: CheckInLookupResponse) -> some View {
        let registration = lookup.registration

        return VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text("\(registration.family_last_name) Family")
                    .font(.title3.weight(.semibold))
                if let lodging = registration.lodging_type {
                    Text(lodging.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                if registration.checked_in == true {
                    Label("Already checked in", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                        .font(.subheadline)
                }
            }

            if let members = lookup.family_members, !members.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Family members")
                        .font(.headline)
                    ForEach(members) { member in
                        Text("• \(member.first_name) \(member.last_name ?? "")")
                            .font(.subheadline)
                    }
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Room keys")
                    .font(.headline)
                TextField("101, 102", text: $roomKeys)
                    .textFieldStyle(.roundedBorder)
            }

            Toggle("T-shirts distributed", isOn: $tshirtsDistributed)

            HStack {
                Button(registration.checked_in == true ? "Update check-in" : "Check in family") {
                    Task { await submitCheckIn() }
                }
                .buttonStyle(.borderedProminent)
                .tint(BrandColors.lake)
                .disabled(isLoading)

                if registration.checked_in == true {
                    Button("Undo", role: .destructive) {
                        Task { await undoCheckIn() }
                    }
                    .disabled(isLoading)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    private func lookupByCode() async {
        guard let client = session.apiClient else { return }
        isLoading = true
        errorMessage = nil
        successMessage = nil
        defer { isLoading = false }

        do {
            let response = try await client.lookupCheckIn(code: code.trimmingCharacters(in: .whitespacesAndNewlines))
            lookup = response
            roomKeys = (response.registration.pre_assigned_keys ?? []).joined(separator: ", ")
            tshirtsDistributed = response.registration.tshirts_distributed ?? false
            searchResults = []
        } catch {
            lookup = nil
            errorMessage = error.localizedDescription
        }
    }

    private func searchFamilies() async {
        guard let client = session.apiClient else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            searchResults = try await client.searchCheckIn(query: searchQuery.trimmingCharacters(in: .whitespacesAndNewlines))
            lookup = nil
        } catch {
            searchResults = []
            errorMessage = error.localizedDescription
        }
    }

    private func selectSearchResult(_ result: CheckInRegistrationSummary) async {
        guard let client = session.apiClient else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let response = try await client.loadCheckInDetails(id: result.id)
            lookup = response
            roomKeys = (response.registration.pre_assigned_keys ?? []).joined(separator: ", ")
            tshirtsDistributed = response.registration.tshirts_distributed ?? false
            searchResults = []
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func submitCheckIn() async {
        guard let client = session.apiClient, let registration = lookup?.registration else { return }
        isLoading = true
        errorMessage = nil
        successMessage = nil
        defer { isLoading = false }

        let keys = roomKeys
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        do {
            let response = try await client.submitCheckIn(
                id: registration.id,
                roomKeys: keys,
                tshirtsDistributed: tshirtsDistributed
            )
            if let updated = response.registration {
                lookup = CheckInLookupResponse(
                    registration: updated,
                    family_members: lookup?.family_members,
                    tshirt_orders: lookup?.tshirt_orders
                )
            }
            successMessage = "\(registration.family_last_name) family checked in."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func undoCheckIn() async {
        guard let client = session.apiClient, let registration = lookup?.registration else { return }
        isLoading = true
        errorMessage = nil
        successMessage = nil
        defer { isLoading = false }

        do {
            _ = try await client.undoCheckIn(id: registration.id)
            let refreshed = try await client.loadCheckInDetails(id: registration.id)
            lookup = refreshed
            roomKeys = ""
            tshirtsDistributed = false
            successMessage = "Check-in undone."
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    NavigationStack {
        CheckInView()
            .environment(AppSession())
    }
}
