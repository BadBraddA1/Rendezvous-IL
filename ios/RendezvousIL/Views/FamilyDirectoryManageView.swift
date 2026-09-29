import SwiftUI
import PhotosUI
import UIKit

struct FamilyDirectoryManageView: View {
    @Environment(AppSession.self) private var session

    @State private var settings = FamilyDirectorySettings(
        photo_url: nil,
        directory_opt_in: true,
        directory_blurb: nil,
        photo_updated_at: nil
    )
    @State private var blurb = ""
    @State private var optIn = true
    @State private var pickerItem: PhotosPickerItem?
    @State private var isLoading = false
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var successMessage: String?
    @State private var faces: [FamilyPhotoFace] = []
    @State private var nameSuggestions: [String] = []
    @State private var selectedFaceId: Int?
    @State private var isSavingFaces = false
    @State private var isDetectingFaces = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                statusBanner

                Text("Registered families appear in the directory by default. After you upload a photo, name each face so the directory shows who is who.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                photoPreview

                PhotosPicker(selection: $pickerItem, matching: .images) {
                    Label(settings.photo_url == nil ? "Upload photo" : "Replace photo", systemImage: "camera.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(BrandColors.lake, in: RoundedRectangle(cornerRadius: 12))
                        .foregroundStyle(.white)
                }
                .disabled(isLoading)

                if settings.photo_url != nil {
                    Button(role: .destructive) {
                        Task { await removePhoto() }
                    } label: {
                        Label("Remove photo", systemImage: "trash")
                            .frame(maxWidth: .infinity)
                    }
                    .disabled(isLoading)

                    faceNamingSection
                }

                Toggle("Hide our family from the directory", isOn: Binding(
                    get: { !optIn },
                    set: { optIn = !$0 }
                ))

                VStack(alignment: .leading, spacing: 8) {
                    Text("Short note (optional)")
                        .font(.headline)
                    TextField("e.g. First time at Rendezvous!", text: $blurb, axis: .vertical)
                        .lineLimit(3...5)
                        .padding(12)
                        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                }

                Button {
                    Task { await saveSettings() }
                } label: {
                    if isSaving {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Save directory settings")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(BrandColors.lake)
                .disabled(isSaving)

                if let successMessage {
                    Text(successMessage)
                        .font(.footnote)
                        .foregroundStyle(.green)
                }
                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }
            .padding()
        }
        .navigationTitle("Directory Photo")
        .refreshable { await loadSettings() }
        .overlay {
            if isLoading && settings.photo_url == nil && blurb.isEmpty {
                ProgressView()
            }
        }
        .task {
            await loadSettings()
        }
        .onChange(of: pickerItem) { _, newItem in
            guard let newItem else { return }
            Task { await uploadPhoto(from: newItem) }
        }
    }

    @ViewBuilder
    private var statusBanner: some View {
        HStack(spacing: 8) {
            Image(systemName: optIn ? "eye.fill" : "eye.slash.fill")
            Text(optIn ? "Your family is visible in the directory" : "Your family is hidden from the directory")
        }
        .font(.caption.weight(.medium))
        .foregroundStyle(optIn ? BrandColors.lake : .secondary)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(BrandColors.lakeLight.opacity(0.6), in: RoundedRectangle(cornerRadius: 10))
    }

    @ViewBuilder
    private var photoPreview: some View {
        Group {
            if let urlString = settings.photo_url, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFit()
                            .frame(maxWidth: .infinity)
                            .overlay {
                                GeometryReader { geo in
                                    ForEach(faces) { face in
                                        let rect = CGRect(
                                            x: face.x * geo.size.width,
                                            y: face.y * geo.size.height,
                                            width: face.w * geo.size.width,
                                            height: face.h * geo.size.height
                                        )
                                        Button {
                                            selectedFaceId = face.id
                                        } label: {
                                            RoundedRectangle(cornerRadius: 6)
                                                .stroke(selectedFaceId == face.id ? BrandColors.lake : Color.white.opacity(0.85), lineWidth: selectedFaceId == face.id ? 3 : 2)
                                                .background(
                                                    RoundedRectangle(cornerRadius: 6)
                                                        .fill(selectedFaceId == face.id ? BrandColors.lake.opacity(0.18) : Color.clear)
                                                )
                                        }
                                        .frame(width: rect.width, height: rect.height)
                                        .position(x: rect.midX, y: rect.midY)

                                        if let label = face.label, !label.isEmpty {
                                            Text(label)
                                                .font(.caption2.weight(.semibold))
                                                .foregroundStyle(.white)
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 2)
                                                .background(Color.black.opacity(0.7), in: Capsule())
                                                .position(
                                                    DirectoryFaceLabelLayout.labelCenter(
                                                        faceRect: rect,
                                                        in: geo.size
                                                    )
                                                )
                                        }
                                    }
                                }
                            }
                    default:
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 160)
                    }
                }
            } else {
                VStack(spacing: 8) {
                    Image(systemName: "person.3.fill")
                        .font(.largeTitle)
                        .foregroundStyle(.secondary)
                    Text("No photo yet")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, minHeight: 160)
            }
        }
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    @ViewBuilder
    private var faceNamingSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Name the faces")
                .font(.headline)
            Text("Tap a face, then pick or type their name. Names show under faces in the directory.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            if faces.isEmpty {
                Text("No faces found yet.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else if let selected = faces.first(where: { $0.id == selectedFaceId }) {
                TextField("Name for this person", text: Binding(
                    get: { selected.label ?? "" },
                    set: { newValue in
                        if let index = faces.firstIndex(where: { $0.id == selected.id }) {
                            faces[index].label = newValue.isEmpty ? nil : newValue
                        }
                    }
                ))
                .textFieldStyle(.roundedBorder)

                if !nameSuggestions.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(nameSuggestions, id: \.self) { name in
                                Button(name) {
                                    if let index = faces.firstIndex(where: { $0.id == selected.id }) {
                                        faces[index].label = name
                                    }
                                }
                                .buttonStyle(.bordered)
                            }
                        }
                    }
                }
            }

            HStack {
                Button {
                    Task { await saveFaces() }
                } label: {
                    if isSavingFaces {
                        ProgressView()
                    } else {
                        Text("Save names")
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(BrandColors.lake)
                .disabled(isSavingFaces || faces.isEmpty)

                Button {
                    Task { await redetectFaces() }
                } label: {
                    if isDetectingFaces {
                        ProgressView()
                    } else {
                        Label("Find faces", systemImage: "sparkles")
                    }
                }
                .disabled(isDetectingFaces)
            }
        }
        .padding(14)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14))
    }

    private func loadSettings() async {
        guard let client = session.apiClient else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let settings = try await RepositoryFetch.withTimeout {
                try await client.getFamilyDirectorySettings()
            }
            applySettings(settings)
            if settings.photo_url != nil {
                await loadFaces()
            } else {
                faces = []
                nameSuggestions = []
            }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadFaces() async {
        guard let client = session.apiClient else { return }
        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.getFamilyPhotoFaces()
            }
            applyFaces(response)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func uploadPhoto(from item: PhotosPickerItem) async {
        guard let client = session.apiClient else { return }
        isLoading = true
        errorMessage = nil
        successMessage = nil
        defer { isLoading = false }

        do {
            guard let data = try await item.loadTransferable(type: Data.self) else {
                throw APIError.badStatus(400)
            }
            let prepared = DirectoryImageProcessor.prepareForUpload(data)
            let response = try await RepositoryFetch.withTimeout(seconds: 90) {
                try await client.uploadFamilyDirectoryPhoto(
                    imageData: prepared,
                    filename: "family-photo.jpg",
                    mimeType: "image/jpeg"
                )
            }
            applySettings(response.settings)

            // Prefer on-device Vision so faces appear immediately even if server AI is slow.
            let localBoxes = DirectoryFaceDetector.detectFaces(in: prepared)
            if !localBoxes.isEmpty {
                let payload = localBoxes.map {
                    FamilyPhotoFaceBoxPayload(x: $0.x, y: $0.y, w: $0.w, h: $0.h)
                }
                let faceResponse = try await RepositoryFetch.withTimeout(seconds: 30) {
                    try await client.submitFamilyPhotoFaceBoxes(payload)
                }
                applyFaces(faceResponse)
                successMessage = "Photo uploaded — tap each face to add a name"
            } else if let uploadedFaces = response.faces, !uploadedFaces.isEmpty {
                faces = uploadedFaces
                nameSuggestions = response.name_suggestions ?? []
                selectedFaceId = uploadedFaces.first(where: { ($0.label ?? "").isEmpty })?.id
                    ?? uploadedFaces.first?.id
                successMessage = "Photo uploaded — tap each face to add a name"
            } else {
                await loadFaces()
                if faces.isEmpty {
                    errorMessage = response.detect_error
                        ?? "No faces found yet. Tap Find faces, or try a clearer photo."
                    successMessage = "Photo uploaded"
                } else {
                    successMessage = "Photo uploaded — tap each face to add a name"
                }
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func removePhoto() async {
        guard let client = session.apiClient else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.deleteFamilyDirectoryPhoto()
            }
            applySettings(response.settings)
            faces = []
            nameSuggestions = []
            selectedFaceId = nil
            successMessage = "Photo removed"
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func saveSettings() async {
        guard let client = session.apiClient else { return }
        isSaving = true
        errorMessage = nil
        successMessage = nil
        defer { isSaving = false }
        do {
            let response = try await RepositoryFetch.withTimeout {
                try await client.updateFamilyDirectorySettings(
                    directoryOptIn: optIn,
                    directoryBlurb: blurb.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : blurb
                )
            }
            applySettings(response.settings)
            successMessage = "Directory settings saved"
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func saveFaces() async {
        guard let client = session.apiClient else { return }
        isSavingFaces = true
        errorMessage = nil
        defer { isSavingFaces = false }
        do {
            let updates = faces.map { FamilyPhotoFaceLabelUpdate(id: $0.id, label: $0.label) }
            let response = try await RepositoryFetch.withTimeout {
                try await client.saveFamilyPhotoFaceLabels(updates)
            }
            applyFaces(response)
            successMessage = "Face names saved"
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func redetectFaces() async {
        guard let client = session.apiClient else { return }
        isDetectingFaces = true
        errorMessage = nil
        defer { isDetectingFaces = false }
        do {
            // Prefer Vision on the downloaded directory photo when possible.
            if let urlString = settings.photo_url, let url = URL(string: urlString) {
                let (data, _) = try await URLSession.shared.data(from: url)
                let localBoxes = DirectoryFaceDetector.detectFaces(in: data)
                if !localBoxes.isEmpty {
                    let payload = localBoxes.map {
                        FamilyPhotoFaceBoxPayload(x: $0.x, y: $0.y, w: $0.w, h: $0.h)
                    }
                    let response = try await RepositoryFetch.withTimeout(seconds: 30) {
                        try await client.submitFamilyPhotoFaceBoxes(payload)
                    }
                    applyFaces(response)
                    successMessage = "Faces found — add names"
                    return
                }
            }

            let response = try await RepositoryFetch.withTimeout(seconds: 60) {
                try await client.redetectFamilyPhotoFaces()
            }
            applyFaces(response)
            if faces.isEmpty {
                errorMessage = response.detect_error ?? "No faces found"
                successMessage = nil
            } else {
                successMessage = "Faces found — add names"
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func applySettings(_ newSettings: FamilyDirectorySettings) {
        settings = newSettings
        optIn = newSettings.directory_opt_in
        blurb = newSettings.directory_blurb ?? ""
    }

    private func applyFaces(_ response: FamilyPhotoFacesResponse) {
        faces = response.faces
        nameSuggestions = response.name_suggestions ?? nameSuggestions
        selectedFaceId = faces.first(where: { ($0.label ?? "").isEmpty })?.id ?? faces.first?.id
    }
}

enum DirectoryImageProcessor {
    /// Downscale and JPEG-compress before upload (faster, fewer failures on cellular).
    static func prepareForUpload(_ data: Data, maxDimension: CGFloat = 1600) -> Data {
        guard let image = UIImage(data: data) else { return data }
        let size = image.size
        let scale = min(1, maxDimension / max(size.width, size.height))
        guard scale < 1 else {
            return image.jpegData(compressionQuality: 0.82) ?? data
        }
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
        return resized.jpegData(compressionQuality: 0.82) ?? data
    }
}

#Preview {
    NavigationStack {
        FamilyDirectoryManageView()
            .environment(AppSession())
    }
}
