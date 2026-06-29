import SwiftUI
import PhotosUI
import Clerk

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
        Group {
            if !session.isSignedIn {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Sign in to manage your directory photo")
                        .font(.title3.weight(.semibold))
                    AuthView()
                        .frame(minHeight: 360)
                }
                .padding()
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        Text("Registered families appear in the directory by default. Add phone numbers on each family member so the directory shows the right name with each number.")
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
            }
        }
        .navigationTitle("Directory Photo")
        .task {
            await session.refreshAuth()
            if session.isSignedIn {
                await loadSettings()
            }
        }
        .onChange(of: pickerItem) { _, newItem in
            guard let newItem else { return }
            Task { await uploadPhoto(from: newItem) }
        }
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
            let settings = try await client.getFamilyDirectorySettings()
            applySettings(settings)
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
            let response = try await client.uploadFamilyDirectoryPhoto(
                imageData: data,
                filename: "family-photo.jpg",
                mimeType: "image/jpeg"
            )
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
            let response = try await client.deleteFamilyDirectoryPhoto()
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
            let response = try await client.updateFamilyDirectorySettings(
                directoryOptIn: optIn,
                directoryBlurb: blurb.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : blurb
            )
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

#Preview {
    NavigationStack {
        FamilyDirectoryManageView()
            .environment(AppSession())
    }
}
