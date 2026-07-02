import Clerk
import SwiftUI

struct AccountView: View {
    @Environment(AppSession.self) private var session

    var body: some View {
        Group {
            if session.isSignedIn {
                signedInContent
            } else {
                signedOutContent
            }
        }
        .navigationTitle("Account")
        .task {
            await session.refreshAuth()
        }
    }

    private var signedOutContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Image(systemName: "person.3.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(BrandColors.lake)

                Text("Family account")
                    .font(.title.weight(.semibold))

                Text("Sign in with the same account you use on rendezvousil.com to manage your family profile, directory photo, and registration.")
                    .font(.body)
                    .foregroundStyle(.secondary)

                AuthView()
                    .frame(minHeight: 360)

                Link(destination: AppConfig.url(for: "/sign-in/forgot-password")) {
                    Label("Forgot password?", systemImage: "key")
                        .font(.subheadline)
                }

                contactBlock
            }
            .padding()
        }
    }

    /// Clerk made `User.fullName` internal; build the display name from the
    /// public first/last name fields instead.
    private var clerkUserDisplayName: String? {
        guard let user = Clerk.shared.user else { return nil }
        let name = [user.firstName, user.lastName]
            .compactMap { $0?.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        return name.isEmpty ? nil : name
    }

    private var signedInContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let name = session.adminName ?? clerkUserDisplayName {
                    Text("Signed in as \(name)")
                        .font(.headline)
                }

                VStack(alignment: .leading, spacing: 12) {
                    infoRow(icon: "calendar", title: "Event dates", value: AppConfig.eventDates)
                    infoRow(icon: "bell", title: "Registration opens", value: AppConfig.registrationOpens)
                    infoRow(icon: "book.closed", title: "Bible Bowl", value: AppConfig.theme)
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

                Link(destination: AppConfig.url(for: "/sign-in/forgot-password")) {
                    Label("Reset password (email code)", systemImage: "envelope")
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

                Button(role: .destructive) {
                    Task { await session.signOut() }
                } label: {
                    Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
                        .frame(maxWidth: .infinity)
                        .padding()
                }

                contactBlock
            }
            .padding()
        }
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
