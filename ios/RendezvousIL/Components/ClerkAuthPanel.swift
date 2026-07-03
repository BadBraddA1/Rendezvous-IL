import Clerk
import SwiftUI

extension ClerkTheme {
  /// Lake-teal Clerk UI that follows system light/dark mode.
  @MainActor
  static var rendezvous: ClerkTheme {
    ClerkTheme(
      colors: .init(primary: BrandColors.lake),
      design: .init(borderRadius: 12)
    )
  }
}

/// Embedded native Clerk sign-in (not dismissable — use inside account/admin screens).
struct ClerkAuthPanel: View {
  var mode: AuthView.Mode = .signInOrUp

  var body: some View {
    Group {
      if AppConfig.hasValidClerkKey {
        AuthView(mode: mode, isDismissable: false)
          .environment(\.clerkTheme, .rendezvous)
          .frame(maxWidth: .infinity, minHeight: 400)
      } else {
        VStack(alignment: .leading, spacing: 8) {
          Text("Sign-in unavailable")
            .font(.headline)
          Text("Add CLERK_PUBLISHABLE_KEY to ios/Config.local.xcconfig, then rebuild.")
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(BrandColors.cardFill, in: RoundedRectangle(cornerRadius: 12))
      }
    }
  }
}
