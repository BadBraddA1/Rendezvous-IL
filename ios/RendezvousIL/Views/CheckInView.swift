import SwiftUI
import PhotosUI
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
    /// RENTESTGOOD offline preview — same staff UI, no API writes.
    @State private var isDemoPreview = false
    /// Full-screen celebration after a successful check-in (auto-hides in 5s).
    @State private var celebrationFamily: String?
    @State private var celebrationDismissTask: Task<Void, Never>?
    /// Obnoxious clear-to-dismiss banner when volume is too low to hear boops.
    @State private var muteAlertKind: CheckInBoopPlayer.Kind?
    @State private var directoryPickerItem: PhotosPickerItem?
    @State private var showDirectoryCamera = false
    @State private var uploadingDirectoryPhoto = false
    @State private var nudgingFamily = false

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

                if lookup == nil {
                    CheckInQRScannerView(
                        onCode: { code in
                            Task { await lookupByCode(code) }
                        },
                        isPaused: false
                    )
                    .aspectRatio(1, contentMode: .fit)
                    .frame(maxWidth: .infinity)

                    Text("Point at a family QR — lookup happens automatically.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                if let lookup {
                    if isDemoPreview {
                        Text("Demo preview — UI only, nothing is saved.")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(BrandColors.lake)
                    }
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
        .overlay {
            if let celebrationFamily {
                CheckInCelebrationOverlay(familyLastName: celebrationFamily) {
                    dismissCelebration()
                }
                .transition(.opacity)
                .zIndex(20)
            }
        }
        .overlay {
            if let muteAlertKind, celebrationFamily == nil {
                CheckInMuteAlertOverlay(kind: muteAlertKind) {
                    withAnimation(.easeIn(duration: 0.2)) {
                        self.muteAlertKind = nil
                    }
                }
                .transition(.opacity)
                .zIndex(30)
            }
        }
        .animation(.easeOut(duration: 0.25), value: celebrationFamily)
        .animation(.easeOut(duration: 0.2), value: muteAlertKind)
        .allowsHitTesting(!isLoading || celebrationFamily != nil || muteAlertKind != nil)
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
        let paymentLabel: String = {
            if registration.full_payment_paid == true { return "Paid in full" }
            if registration.registration_fee_paid == true { return "Reg fee paid" }
            return "Payment due"
        }()

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

            Label(paymentLabel, systemImage: "creditcard")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            if let members = lookup.family_members, !members.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Family members")
                        .font(.headline)
                    ForEach(members) { member in
                        Text(memberLine(member))
                            .font(.subheadline)
                    }
                }
            }

            if let shirts = lookup.tshirt_orders, !shirts.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("T-shirts ordered")
                        .font(.headline)
                    ForEach(shirts) { shirt in
                        Text("• \(shirt.quantity ?? 1)× \(shirt.size ?? "?") \(shirt.color ?? "")")
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
                Button(registration.checked_in == true ? "Update" : "Finalize") {
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

            if let familyId = lookup.directory_family_id, familyId > 0, !isDemoPreview {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Directory photo")
                        .font(.headline)
                    if let photoUrl = lookup.directory_photo_url, !photoUrl.isEmpty {
                        let labeled = lookup.directory_faces_labeled ?? 0
                        let total = lookup.directory_faces_total ?? 0
                        Text(
                            total > 0
                                ? "Photo on file · \(labeled)/\(total) faces named"
                                : "Photo on file — ask family to name faces"
                        )
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        Button {
                            Task { await nudgeDirectoryProfile(familyId: familyId) }
                        } label: {
                            if nudgingFamily {
                                ProgressView()
                            } else {
                                Label("Ping family to finish profile", systemImage: "bell.badge")
                            }
                        }
                        .font(.subheadline.weight(.semibold))
                        .disabled(nudgingFamily || isLoading)
                    }
                    HStack(spacing: 10) {
                        PhotosPicker(selection: $directoryPickerItem, matching: .images) {
                            Label(
                                uploadingDirectoryPhoto ? "Uploading…" : "Choose photo",
                                systemImage: "photo.on.rectangle"
                            )
                        }
                        .disabled(uploadingDirectoryPhoto || isLoading)

                        Button {
                            showDirectoryCamera = true
                        } label: {
                            Label("Take photo", systemImage: "camera.fill")
                        }
                        .disabled(uploadingDirectoryPhoto || isLoading || !UIImagePickerController.isSourceTypeAvailable(.camera))
                    }
                    .font(.subheadline.weight(.semibold))
                }
            } else if !isDemoPreview {
                Text("No family directory profile linked — photo upload unavailable.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if registration.checked_in == true {
                Button("Scan next family") {
                    resetStation()
                }
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .buttonStyle(.bordered)
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
        .onChange(of: directoryPickerItem) { _, item in
            guard let item else { return }
            Task { await uploadDirectoryPhoto(from: item) }
        }
        .sheet(isPresented: $showDirectoryCamera) {
            CheckInCameraPicker { data in
                Task { await uploadDirectoryPhotoData(data) }
            }
            .ignoresSafeArea()
        }
    }

    private func memberLine(_ member: CheckInFamilyMember) -> String {
        let age = member.age.map { " (\($0))" } ?? ""
        return "• \(member.first_name) \(member.last_name ?? "")\(age)"
    }

    private func resetStation() {
        lookup = nil
        roomKeys = ""
        tshirtsDistributed = false
        errorMessage = nil
        successMessage = nil
        isDemoPreview = false
        celebrationDismissTask?.cancel()
        celebrationFamily = nil
        muteAlertKind = nil
        directoryPickerItem = nil
        uploadingDirectoryPhoto = false
    }

    private func uploadDirectoryPhoto(from item: PhotosPickerItem) async {
        do {
            guard let data = try await item.loadTransferable(type: Data.self) else {
                errorMessage = "Could not read that photo."
                return
            }
            await uploadDirectoryPhotoData(data)
        } catch {
            errorMessage = error.localizedDescription
        }
        directoryPickerItem = nil
    }

    private func uploadDirectoryPhotoData(_ data: Data) async {
        guard let familyId = lookup?.directory_family_id, familyId > 0 else {
            errorMessage = "No family directory profile linked for this registration."
            return
        }
        guard let client = session.apiClient else { return }
        uploadingDirectoryPhoto = true
        errorMessage = nil
        successMessage = nil
        defer { uploadingDirectoryPhoto = false }

        do {
            let prepared = DirectoryImageProcessor.prepareForUpload(data)
            let response = try await RepositoryFetch.withTimeout(seconds: 90) {
                try await client.uploadAdminDirectoryFamilyPhoto(
                    familyId: familyId,
                    imageData: prepared,
                    filename: "family-photo.jpg",
                    mimeType: "image/jpeg"
                )
            }
            let pinged = response.notify_recipients ?? 0
            successMessage = pinged > 0
                ? "Photo uploaded · pinged family (\(pinged))"
                : "Photo uploaded · family has no app devices yet"
            if let current = lookup {
                lookup = CheckInLookupResponse(
                    registration: current.registration,
                    family_members: current.family_members,
                    tshirt_orders: current.tshirt_orders,
                    directory_family_id: current.directory_family_id,
                    directory_photo_url: response.photo_url ?? current.directory_photo_url,
                    directory_faces_labeled: 0,
                    directory_faces_total: 0
                )
            }
            boop(.good)
        } catch {
            errorMessage = error.localizedDescription
            boop(.bad)
        }
    }

    private func nudgeDirectoryProfile(familyId: Int) async {
        guard let client = session.apiClient else { return }
        nudgingFamily = true
        errorMessage = nil
        successMessage = nil
        defer { nudgingFamily = false }
        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.nudgeFamilyDirectoryProfile(familyId: familyId)
            }
            successMessage = response.message ?? "Family pinged"
            boop(.good)
        } catch {
            errorMessage = error.localizedDescription
            boop(.bad)
        }
    }

    /// Play boop; if volume is too low, show the clear-to-dismiss mute banner
    /// (skipped when the celebration overlay already covers success feedback).
    private func boop(_ kind: CheckInBoopPlayer.Kind, suppressMuteAlert: Bool = false) {
        CheckInBoopPlayer.play(kind) {
            guard !suppressMuteAlert else { return }
            muteAlertKind = kind
        }
    }

    private func showCelebration(familyLastName: String) {
        celebrationDismissTask?.cancel()
        celebrationFamily = familyLastName
        celebrationDismissTask = Task { @MainActor in
            try? await Task.sleep(for: .seconds(4.5))
            guard !Task.isCancelled else { return }
            dismissCelebration()
        }
    }

    private func dismissCelebration() {
        celebrationDismissTask?.cancel()
        celebrationDismissTask = nil
        withAnimation(.easeIn(duration: 0.25)) {
            celebrationFamily = nil
        }
        // Back to the camera immediately — less scrolling for the next family.
        resetStation()
    }

    private func lookupByCode(_ raw: String) async {
        let code = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !code.isEmpty else { return }

        // Offline good-boop + full staff UI preview (not a real family).
        if code.uppercased() == "RENTESTGOOD" {
            let demo = Self.demoLookup
            lookup = demo
            roomKeys = (demo.registration.pre_assigned_keys ?? []).joined(separator: ", ")
            tshirtsDistributed = demo.registration.tshirts_distributed ?? false
            isDemoPreview = true
            errorMessage = nil
            successMessage = nil
            boop(.good)
            return
        }

        guard let client = session.apiClient else { return }

        isLoading = true
        errorMessage = nil
        successMessage = nil
        isDemoPreview = false
        defer { isLoading = false }

        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.lookupCheckIn(code: code)
            }
            lookup = response
            roomKeys = (response.registration.pre_assigned_keys ?? []).joined(separator: ", ")
            tshirtsDistributed = response.registration.tshirts_distributed ?? false
            boop(.good)
        } catch {
            lookup = nil
            errorMessage = error.localizedDescription
            boop(.bad)
        }
    }

    private func submitCheckIn() async {
        guard let registration = lookup?.registration else { return }

        if isDemoPreview {
            lookup = Self.demoLookupCheckedIn(
                roomKeys: roomKeys,
                tshirtsDistributed: tshirtsDistributed
            )
            successMessage = nil
            errorMessage = nil
            boop(.good, suppressMuteAlert: true)
            showCelebration(familyLastName: registration.family_last_name)
            return
        }

        guard let client = session.apiClient else { return }
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
                    tshirt_orders: lookup?.tshirt_orders,
                    directory_family_id: lookup?.directory_family_id,
                    directory_photo_url: lookup?.directory_photo_url,
                    directory_faces_labeled: lookup?.directory_faces_labeled,
                    directory_faces_total: lookup?.directory_faces_total
                )
            }
            successMessage = nil
            boop(.good, suppressMuteAlert: true)
            showCelebration(familyLastName: registration.family_last_name)
        } catch {
            errorMessage = error.localizedDescription
            boop(.bad)
        }
    }

    private func undoCheckIn() async {
        guard let registration = lookup?.registration else { return }

        if isDemoPreview {
            lookup = Self.demoLookup
            roomKeys = (Self.demoLookup.registration.pre_assigned_keys ?? []).joined(separator: ", ")
            tshirtsDistributed = false
            successMessage = "Demo: check-in undone."
            errorMessage = nil
            boop(.good)
            return
        }

        guard let client = session.apiClient else { return }
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
            boop(.good)
        } catch {
            errorMessage = error.localizedDescription
            boop(.bad)
        }
    }

    /// Rich demo payload so staff can walk the real check-in card.
    private static let demoLookup: CheckInLookupResponse = {
        let json = """
        {
          "registration": {
            "id": -1,
            "family_last_name": "Bradd",
            "email": "demo@rendezvousil.test",
            "husband_phone": "217-555-0101",
            "wife_phone": "217-555-0102",
            "lodging_type": "motel",
            "checkin_qr_code": "RENTESTGOOD",
            "checked_in": false,
            "checked_in_at": null,
            "pre_assigned_keys": ["214", "215"],
            "tshirts_distributed": false,
            "full_payment_paid": true,
            "registration_fee_paid": true
          },
          "family_members": [
            { "id": 1, "first_name": "Adin", "last_name": "Bradd", "age": 36 },
            { "id": 2, "first_name": "Maddy", "last_name": "Bradd", "age": 34 },
            { "id": 3, "first_name": "Kiddo", "last_name": "Bradd", "age": 8 }
          ],
          "tshirt_orders": [
            { "id": 1, "size": "L", "color": "Lake Teal", "quantity": 2 },
            { "id": 2, "size": "YS", "color": "Lake Teal", "quantity": 1 }
          ]
        }
        """
        return try! JSONDecoder().decode(CheckInLookupResponse.self, from: Data(json.utf8))
    }()

    private static func demoLookupCheckedIn(roomKeys: String, tshirtsDistributed: Bool) -> CheckInLookupResponse {
        let keys = roomKeys
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        let keysJSON = keys.map { "\"\($0)\"" }.joined(separator: ",")
        let json = """
        {
          "registration": {
            "id": -1,
            "family_last_name": "Bradd",
            "email": "demo@rendezvousil.test",
            "husband_phone": "217-555-0101",
            "wife_phone": "217-555-0102",
            "lodging_type": "motel",
            "checkin_qr_code": "RENTESTGOOD",
            "checked_in": true,
            "checked_in_at": "2027-05-03T18:00:00.000Z",
            "pre_assigned_keys": [\(keysJSON)],
            "tshirts_distributed": \(tshirtsDistributed ? "true" : "false"),
            "full_payment_paid": true,
            "registration_fee_paid": true
          },
          "family_members": [
            { "id": 1, "first_name": "Adin", "last_name": "Bradd", "age": 36 },
            { "id": 2, "first_name": "Maddy", "last_name": "Bradd", "age": 34 },
            { "id": 3, "first_name": "Kiddo", "last_name": "Bradd", "age": 8 }
          ],
          "tshirt_orders": [
            { "id": 1, "size": "L", "color": "Lake Teal", "quantity": 2 },
            { "id": 2, "size": "YS", "color": "Lake Teal", "quantity": 1 }
          ]
        }
        """
        return try! JSONDecoder().decode(CheckInLookupResponse.self, from: Data(json.utf8))
    }
}

/// One-shot camera capture for check-in directory photos.
private struct CheckInCameraPicker: UIViewControllerRepresentable {
    var onCapture: (Data) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.cameraCaptureMode = .photo
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CheckInCameraPicker
        init(parent: CheckInCameraPicker) { self.parent = parent }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            defer { parent.dismiss() }
            guard let image = info[.originalImage] as? UIImage,
                  let data = image.jpegData(compressionQuality: 0.92)
            else { return }
            parent.onCapture(data)
        }
    }
}

#Preview {
    NavigationStack {
        CheckInView()
            .environment(AppSession())
    }
}
