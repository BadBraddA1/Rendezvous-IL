import SwiftUI

struct AccountView: View {
    @Environment(AppSession.self) private var session

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Image(systemName: "person.3.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(BrandColors.lake)

                Text("Family account")
                    .font(.title.weight(.semibold))

                Text("Registration for Rendezvous 2027 opens ")
                + Text("January 1, 2027").fontWeight(.semibold)
                + Text(". After you register on the website, you can manage your family profile, lodging, and meal preferences from your account.")
                    .font(.body)
                    .foregroundStyle(.secondary)

                VStack(alignment: .leading, spacing: 12) {
                    infoRow(icon: "calendar", title: "Event dates", value: AppConfig.eventDates)
                    infoRow(icon: "bell", title: "Registration opens", value: AppConfig.registrationOpens)
                    infoRow(icon: "book.closed", title: "Bible Bowl", value: AppConfig.theme)
                }
                .padding()
                .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))

                Text("Account sign-in uses the same secure login as rendezvousil.com. Native sign-in is planned for a future update.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                Link(destination: AppConfig.url(for: "/account")) {
                    Label("Manage account on website", systemImage: "safari")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(BrandColors.lake, in: RoundedRectangle(cornerRadius: 12))
                        .foregroundStyle(.white)
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

                Link(destination: AppConfig.url(for: "/registration")) {
                    Label("Registration info", systemImage: "doc.text")
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
        .task { await session.refreshAuth() }
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
