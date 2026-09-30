import SwiftUI
import PhotosUI
import UIKit

/// Staff desk tool: scan a family QR and upload / nudge directory photos (separate from check-in).
struct StaffDirectoryPhotoView: View {
    @Environment(AppSession.self) private var session

    @State private var lookup: CheckInLookupResponse?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var successMessage: String?
    @State private var keepDisplayAlive = true
    @State private var directoryPickerItem: PhotosPickerItem?
    @State private var showDirectoryCamera = false
    @State private var uploadingDirectoryPhoto = false
    @State private var nudgingFamily = false

    var body: some View {
        Group {
            if !session.canCheckIn {
                accessDenied
            } else {
                station
            }
        }
        .navigationTitle("Directory photos")
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
            Text("Staff access required")
                .font(.title3.weight(.semibold))
            Text("Your account needs check-in permissions to upload directory photos at the desk.")
                .foregroundStyle(.secondary)
        }
        .padding()
    }

    private var station: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let name = session.adminName ?? session.userDisplayName {
                    Text("Staff: \(name)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Toggle("Keep display on", isOn: $keepDisplayAlive)
                    .font(.subheadline)

                if lookup == nil {
                    CheckInQRScannerView(
                        onCode: { code in
                            Task { await lookupByCode(code) }
                        },
                        isPaused: false
                    )
                    .aspectRatio(1, contentMode: .fit)
                    .frame(maxWidth: .infinity)

                    Text("Point at a family QR — then take or choose their directory photo.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                if let lookup {
                    familyCard(lookup)
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

                if isLoading || uploadingDirectoryPhoto {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                }
            }
            .padding()
        }
        .onChange(of: directoryPickerItem) { _, item in
            guard let item else { return }
            Task { await uploadDirectoryPhoto(from: item) }
        }
        .sheet(isPresented: $showDirectoryCamera) {
            StaffDirectoryCameraPicker { data in
                Task { await uploadDirectoryPhotoData(data) }
            }
            .ignoresSafeArea()
        }
    }

    @ViewBuilder
    private func familyCard(_ lookup: CheckInLookupResponse) -> some View {
        let registration = lookup.registration
        VStack(alignment: .leading, spacing: 14) {
            Text("\(registration.family_last_name) Family")
                .font(.title3.weight(.semibold))

            if let members = lookup.family_members, !members.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(members) { member in
                        let age = member.age.map { " (\($0))" } ?? ""
                        Text("• \(member.first_name) \(member.last_name ?? "")\(age)")
                            .font(.subheadline)
                    }
                }
            }

            if let familyId = lookup.directory_family_id, familyId > 0 {
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
                    .disabled(nudgingFamily || isLoading || uploadingDirectoryPhoto)
                } else {
                    Text("No directory photo yet — take one now.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
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
                    .buttonStyle(.borderedProminent)
                    .tint(BrandColors.lake)
                    .disabled(
                        uploadingDirectoryPhoto
                            || isLoading
                            || !UIImagePickerController.isSourceTypeAvailable(.camera)
                    )
                }
                .font(.subheadline.weight(.semibold))
            } else {
                Text("No family directory profile linked — photo upload unavailable.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Button("Scan next family") {
                resetStation()
            }
            .font(.subheadline.weight(.semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .buttonStyle(.bordered)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    private func resetStation() {
        lookup = nil
        errorMessage = nil
        successMessage = nil
        directoryPickerItem = nil
        uploadingDirectoryPhoto = false
        nudgingFamily = false
    }

    private func lookupByCode(_ code: String) async {
        let trimmed = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, let client = session.apiClient else { return }
        isLoading = true
        errorMessage = nil
        successMessage = nil
        defer { isLoading = false }
        do {
            lookup = try await RepositoryFetch.withTimeout {
                try await client.lookupCheckIn(code: trimmed)
            }
        } catch {
            lookup = nil
            errorMessage = error.localizedDescription
        }
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
        } catch {
            errorMessage = error.localizedDescription
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
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// One-shot camera capture for staff directory photos.
private struct StaffDirectoryCameraPicker: UIViewControllerRepresentable {
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
        let parent: StaffDirectoryCameraPicker
        init(parent: StaffDirectoryCameraPicker) { self.parent = parent }

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
