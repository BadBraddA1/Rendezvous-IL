import SwiftUI
import UIKit

/// Staff check-in station: persistent QR scanner only (no code entry / name search).
struct CheckInView: View {
    @Environment(AppSession.self) private var session

    @State private var lookup: CheckInLookupResponse?
    @State private var roomKeys = ""
    @State private var tshirtsDistributed = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var successMessage: String?
    @State private var keepDisplayAlive = true

    private var scannerPaused: Bool { lookup != nil || isLoading }

    var body: some View {
        Group {
            if !session.canCheckIn {
                accessDenied
            } else {
                checkInStation
            }
        }
        .navigationTitle("Check-In")
        .navigationBarTitleDisplayMode(.inline)
        .onChange(of: keepDisplayAlive) { _, enabled in
            UIApplication.shared.isIdleTimerDisabled = enabled
        }
        .onAppear {
            UIApplication.shared.isIdleTimerDisabled = keepDisplayAlive
        }
        .onDisappear {
            UIApplication.shared.isIdleTimerDisabled = false
        }
        .task {
            await session.refreshAdminStatus()
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
            if let name = session.adminName ?? session.userDisplayName {
                Text("Signed in as \(name)")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
    }

    private var checkInStation: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let name = session.adminName ?? session.userDisplayName {
                    Text("Staff: \(name)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                keepDisplayAliveToggle

                CheckInQRScannerView(
                    onCode: { code in
                        Task { await lookupByCode(code) }
                    },
                    isPaused: scannerPaused
                )
                .aspectRatio(1, contentMode: .fit)
                .frame(maxWidth: .infinity)

                if lookup == nil {
                    Text("Point at a family QR — lookup happens automatically.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                if let lookup {
                    resultSection(lookup)

                    Button("Scan next family") {
                        resetStation()
                    }
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .buttonStyle(.bordered)
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
        .overlay {
            if isLoading {
                ZStack {
                    Color.black.opacity(0.08).ignoresSafeArea()
                    ProgressView()
                        .padding(20)
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                }
            }
        }
        .allowsHitTesting(!isLoading)
    }

    private var keepDisplayAliveToggle: some View {
        Toggle(isOn: $keepDisplayAlive) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Keep display alive")
                    .font(.subheadline.weight(.semibold))
                Text("Prevents the screen from sleeping while check-in is open.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(14)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
        .tint(BrandColors.lake)
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

    private func resetStation() {
        lookup = nil
        roomKeys = ""
        tshirtsDistributed = false
        errorMessage = nil
        successMessage = nil
    }

    private func lookupByCode(_ raw: String) async {
        let code = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !code.isEmpty else { return }

        // Offline good-boop test QR (see /tmp/ren-checkin-good-qr) — not a real family.
        if code.uppercased() == "RENTESTGOOD" {
            errorMessage = nil
            successMessage = "Good boop test — not a real check-in."
            lookup = nil
            CheckInBoopPlayer.play(.good)
            return
        }

        guard let client = session.apiClient else { return }

        isLoading = true
        errorMessage = nil
        successMessage = nil
        defer { isLoading = false }

        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.lookupCheckIn(code: code)
            }
            lookup = response
            roomKeys = (response.registration.pre_assigned_keys ?? []).joined(separator: ", ")
            tshirtsDistributed = response.registration.tshirts_distributed ?? false
            CheckInBoopPlayer.play(.good)
        } catch {
            lookup = nil
            errorMessage = error.localizedDescription
            CheckInBoopPlayer.play(.bad)
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
            let response = try await RepositoryFetch.withTimeout(seconds: 20) {
                try await client.submitCheckIn(
                    id: registration.id,
                    roomKeys: keys,
                    tshirtsDistributed: tshirtsDistributed
                )
            }
            if let updated = response.registration {
                lookup = CheckInLookupResponse(
                    registration: updated,
                    family_members: lookup?.family_members,
                    tshirt_orders: lookup?.tshirt_orders
                )
            }
            successMessage = "\(registration.family_last_name) family checked in."
            CheckInBoopPlayer.play(.good)
        } catch {
            errorMessage = error.localizedDescription
            CheckInBoopPlayer.play(.bad)
        }
    }

    private func undoCheckIn() async {
        guard let client = session.apiClient, let registration = lookup?.registration else { return }
        isLoading = true
        errorMessage = nil
        successMessage = nil
        defer { isLoading = false }

        do {
            _ = try await RepositoryFetch.withTimeout {
                try await client.undoCheckIn(id: registration.id)
            }
            let refreshed = try await RepositoryFetch.withTimeout {
                try await client.loadCheckInDetails(id: registration.id)
            }
            lookup = refreshed
            roomKeys = (refreshed.registration.pre_assigned_keys ?? []).joined(separator: ", ")
            tshirtsDistributed = refreshed.registration.tshirts_distributed ?? false
            successMessage = "Check-in undone."
            CheckInBoopPlayer.play(.good)
        } catch {
            errorMessage = error.localizedDescription
            CheckInBoopPlayer.play(.bad)
        }
    }
}

#Preview {
    NavigationStack {
        CheckInView()
            .environment(AppSession())
    }
}
