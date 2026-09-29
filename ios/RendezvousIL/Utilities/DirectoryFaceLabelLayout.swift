import CoreGraphics
import SwiftUI

enum DirectoryFaceLabelLayout {
    /// Approx half-height of the name capsule (font + padding). `.position` is center-based.
    private static let halfLabelHeight: CGFloat = 10
    private static let gap: CGFloat = 6

    /// Center point for a name chip so the chip sits fully below the face (or above if near the bottom edge).
    static func labelCenter(faceRect: CGRect, in container: CGSize) -> CGPoint {
        let below = faceRect.maxY + gap + halfLabelHeight
        let above = faceRect.minY - gap - halfLabelHeight
        let y: CGFloat
        if below <= container.height - 4 {
            y = below
        } else {
            y = max(halfLabelHeight + 4, above)
        }
        let x = min(max(faceRect.midX, 24), max(24, container.width - 24))
        return CGPoint(x: x, y: y)
    }
}
