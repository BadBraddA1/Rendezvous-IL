import Clerk
import SwiftUI

struct AccountView: View {
    @Environment(AppSession.self) private var session

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let name = session.adminName ?? session.userDisplayName {
                    Text("Signed in as \(name)")
                        .font(.headline)
                }

                VStack(alignment: .leading, spacing: 12) {
                    infoRow(icon: "calendar", title: "Event dates", value: AppConfig.eventDates)
                    infoRow(icon: "book.closed", title: "Bible Bowl", value: AppConfig.theme)
                    infoRow(icon: "mappin.and.ellipse", title: "Location", value: AppConfig.location)
                }
                .padding()
                .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))

                Link(destination: AppConfig.url(for: "/account")) {
                    Label("Family dashboard on web", systemImage: "safari")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(BrandColors.lake, in: RoundedRectangle(cornerRadius: 12))
                        .foregroundStyle(.white)
                }

                Link(destination: AppConfig.url(for: "/account/settings")) {
                    Label("Change password on web", systemImage: "key")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                        .foregroundStyle(BrandColors.lake)
                }

                NavigationLink {
                    FamilyDirectoryManageView()
                } label: {
                    Label("Upload directory photo", systemImage: "camera.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                        .foregroundStyle(BrandColors.lake)
                }

                NavigationLink {
                    DirectoryView()
                } label: {
                    Label("Browse family directory", systemImage: "person.3.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                        .foregroundStyle(BrandColors.lake)
                }

                contactBlock
            }
            .padding()
        }
        .navigationTitle("Account")
    }

    private func infoRow(icon: String, title: String, value: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(BrandColors.coral)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text(value)
                    .font(.subheadline)
            }
        }
    }

    private var contactBlock: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Questions?")
                .font(.headline)
            Link(BundledContent.contactEmail, destination: URL(string: "mailto:\(BundledContent.contactEmail)")!)
            Link(BundledContent.contactPhone, destination: URL(string: "tel:+12179355058")!)
        }
        .font(.subheadline)
    }
}

#Preview {
    NavigationStack { AccountView().environment(AppSession()) }
}
