import CoreImage
import SwiftUI
import UIKit

/// Low-contrast lakeside watermark QR for staff check-in (Digimarc spirit, standard QR).
struct StealthCheckInMarkView: View {
    let code: String
    let familyLastName: String?

    @State private var bright = false
    @State private var qrImage: UIImage?
    @State private var dimTask: Task<Void, Never>?

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
                Text("Staff can scan this Home screen. Double-tap to brighten.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
        .padding(16)
        .background {
            ZStack {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [
                                BrandColors.lake.opacity(0.1),
                                Color(.secondarySystemGroupedBackground),
                                BrandColors.lakeLight.opacity(0.55),
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
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
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(BrandColors.lake.opacity(0.16), lineWidth: 1)
        )
        .onTapGesture(count: 2) {
            toggleBright()
        }
        .accessibilityLabel("Check-in watermark. Double-tap to brighten for staff scan.")
        .accessibilityHint(bright ? "Bright. Double-tap again to dim." : "Dim. Double-tap to brighten.")
        .accessibilityAddTraits(.isButton)
        .task(id: code) {
            qrImage = Self.makeQRImage(code)
        }
        .onDisappear {
            dimTask?.cancel()
        }
    }

    private func toggleBright() {
        dimTask?.cancel()
        withAnimation(.easeInOut(duration: 0.2)) {
            bright.toggle()
        }
        if bright {
            dimTask = Task { @MainActor in
                try? await Task.sleep(for: .seconds(12))
                guard !Task.isCancelled else { return }
                withAnimation(.easeInOut(duration: 0.25)) {
                    bright = false
                }
            }
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
