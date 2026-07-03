import Clerk
import SwiftUI

/// Re-apply session + Clerk when presenting sheets so nested auth never crashes.
extension View {
    func withAppEnvironments(session: AppSession) -> some View {
        environment(session)
            .environment(\.clerk, Clerk.shared)
    }
}
