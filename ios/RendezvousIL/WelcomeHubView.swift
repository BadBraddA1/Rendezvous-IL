import Clerk
import SwiftUI

/// Public welcome — sign-in only. No registration sales pitch.
struct WelcomeHubView: View {
    @Environment(AppSession.self) private var session
    @Environment(Clerk.self) private var clerk

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 28) {
                    hero

                    ClerkAuthPanel(
                        sectionTitle: "Sign in",
                        helperText: "Use the same email and password as rendezvousil.com. This app is for families who are registered for Rendezvous.",
                        buttonTitle: "Sign in"
                    )

                    VStack(alignment: .leading, spacing: 10) {
                        Label("Schedule & updates during retreat week", systemImage: "calendar")
                        Label("Year group chat with other families", systemImage: "bubble.left.and.bubble.right")
                        Label("Family directory & your profile", systemImage: "person.3")
                    }
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14))

                    contactFooter
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 28)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Rendezvous")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var hero: some View {
        VStack(spacing: 12) {
            Text("Rendezvous \(AppConfig.eventYear)")
                .font(.system(.largeTitle, design: .serif))
                .fontWeight(.semibold)
                .foregroundStyle(BrandColors.lake)
                .multilineTextAlignment(.center)

            Text("Your retreat community")
                .font(.title3)
                .foregroundStyle(.secondary)

            Text("\(AppConfig.eventDates) · \(AppConfig.location)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Text("Bible Bowl: \(AppConfig.theme)")
                .font(.footnote.weight(.medium))
                .foregroundStyle(BrandColors.coralInk)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(BrandColors.warmSurface, in: Capsule())
        }
        .frame(maxWidth: .infinity)
    }

    private var contactFooter: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Need help signing in?")
                .font(.headline)
            Link(BundledContent.contactEmail, destination: URL(string: "mailto:\(BundledContent.contactEmail)")!)
            Link("Reset password on web", destination: AppConfig.url(for: "/sign-in/forgot-password"))
                .font(.subheadline)
        }
        .font(.subheadline)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
