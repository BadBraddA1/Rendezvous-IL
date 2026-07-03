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

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                statusBanner

                Text("Registered families appear in the directory by default. Add phone numbers on each family member on the website so the directory shows the right name with each number.")
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
                            .scaledToFill()
                    default:
                        ProgressView()
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
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 220)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
        .clipShape(RoundedRectangle(cornerRadius: 16))
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
            errorMessage = nil
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
            let response = try await RepositoryFetch.withTimeout(seconds: 30) {
                try await client.uploadFamilyDirectoryPhoto(
                    imageData: prepared,
                    filename: "family-photo.jpg",
                    mimeType: "image/jpeg"
                )
            }
            applySettings(response.settings)
            successMessage = "Photo uploaded"
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

    private func applySettings(_ newSettings: FamilyDirectorySettings) {
        settings = newSettings
        optIn = newSettings.directory_opt_in
        blurb = newSettings.directory_blurb ?? ""
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
