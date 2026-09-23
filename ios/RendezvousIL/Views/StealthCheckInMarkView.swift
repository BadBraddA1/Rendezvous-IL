import CoreImage
import SwiftUI
import UIKit

/// Low-contrast lakeside watermark QR for staff check-in (Digimarc spirit, standard QR).
struct StealthCheckInMarkView: View {
    let code: String
    let familyLastName: String?

    @State private var bright = false
    @State private var qrImage: UIImage?

    var body: some View {
        HStack(alignment: .center, spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(bright ? Color.white : Color.clear)
                if let qrImage {
                    Image(uiImage: qrImage)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .padding(bright ? 10 : 4)
                        .opacity(bright ? 1 : 0.28)
                }
            }
            .frame(width: 112, height: 112)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(BrandColors.lake.opacity(0.18), lineWidth: 1)
            )

            VStack(alignment: .leading, spacing: 4) {
                Text("DESK SCAN")
                    .font(.caption2.weight(.bold))
                    .tracking(1.2)
                    .foregroundStyle(BrandColors.lake)
                Text(familyLastName.map { "\($0) family" } ?? "Your check-in mark")
                    .font(.subheadline.weight(.semibold))
                Text("Staff can scan this Home screen. Hold to brighten.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
        .padding(16)
        .background(
            ZStack {
                LinearGradient(
                    colors: [
                        BrandColors.lake.opacity(0.1),
                        Color(.secondarySystemGroupedBackground),
                        BrandColors.lakeLight.opacity(0.55),
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                // Soft dot field — “woven” texture, not a loud ticket card.
                Canvas { context, size in
                    let step: CGFloat = 14
                    var y: CGFloat = 8
                    while y < size.height {
                        var x: CGFloat = 8
                        while x < size.width {
                            let rect = CGRect(x: x, y: y, width: 1.2, height: 1.2)
                            context.fill(Path(ellipseIn: rect), with: .color(BrandColors.lake.opacity(0.12)))
                            x += step
                        }
                        y += step
                    }
                }
                .opacity(0.9)
            }
            , in: RoundedRectangle(cornerRadius: 16, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(BrandColors.lake.opacity(0.16), lineWidth: 1)
        )
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in bright = true }
                .onEnded { _ in bright = false }
        )
        .accessibilityLabel("Check-in watermark. Hold to brighten for staff scan.")
        .task(id: code) {
            qrImage = Self.makeQRImage(code)
        }
    }

    private static func makeQRImage(_ code: String) -> UIImage? {
        let data = Data(code.utf8)
        guard let filter = CIFilter(name: "CIQRCodeGenerator") else { return nil }
        filter.setValue(data, forKey: "inputMessage")
        filter.setValue("H", forKey: "inputCorrectionLevel")
        guard let output = filter.outputImage else { return nil }

        let scaled = output.transformed(by: CGAffineTransform(scaleX: 12, y: 12))
        let colored = scaled.applyingFilter("CIFalseColor", parameters: [
            "inputColor0": CIColor(red: 0.22, green: 0.55, blue: 0.52),
            "inputColor1": CIColor(red: 0, green: 0, blue: 0, alpha: 0),
        ])
        let context = CIContext()
        guard let cg = context.createCGImage(colored, from: colored.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}
