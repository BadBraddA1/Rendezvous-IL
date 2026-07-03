import SwiftUI
import UIKit

/// Lake-teal + coral palette — adaptive for light and dark mode.
enum BrandColors {
  static let lake = Color(red: 0.22, green: 0.55, blue: 0.52)

  static let lakeLight = Color(
    uiColor: UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor(red: 0.12, green: 0.28, blue: 0.27, alpha: 1)
        : UIColor(red: 0.88, green: 0.95, blue: 0.94, alpha: 1)
    }
  )

  static let coral = Color(red: 0.78, green: 0.45, blue: 0.32)

  static let coralInk = Color(
    uiColor: UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor(red: 0.95, green: 0.72, blue: 0.62, alpha: 1)
        : UIColor(red: 0.55, green: 0.28, blue: 0.18, alpha: 1)
    }
  )

  static let warmSurface = Color(
    uiColor: UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor(red: 0.16, green: 0.15, blue: 0.14, alpha: 1)
        : UIColor(red: 0.98, green: 0.96, blue: 0.93, alpha: 1)
    }
  )

  static let cardFill = Color(
    uiColor: UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor.secondarySystemGroupedBackground
        : UIColor.secondarySystemGroupedBackground
    }
  )

  static let cardBorder = Color(
    uiColor: UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor(white: 1, alpha: 0.12)
        : UIColor(red: 0.88, green: 0.90, blue: 0.91, alpha: 1)
    }
  )
}
