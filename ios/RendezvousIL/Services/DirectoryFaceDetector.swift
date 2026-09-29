import Vision
import UIKit

enum DirectoryFaceDetector {
    /// Normalized face boxes (0–1, top-left origin) for the given JPEG/PNG data.
    static func detectFaces(in imageData: Data) -> [(x: Double, y: Double, w: Double, h: Double)] {
        guard let image = UIImage(data: imageData),
              let cgImage = image.cgImage
        else { return [] }

        let request = VNDetectFaceRectanglesRequest()
        let handler = VNImageRequestHandler(cgImage: cgImage, orientation: cgImageOrientation(from: image), options: [:])
        do {
            try handler.perform([request])
        } catch {
            return []
        }

        let observations = (request.results as? [VNFaceObservation]) ?? []
        return observations
            .map { observation in
                // Vision boundingBox origin is bottom-left; convert to top-left.
                let box = observation.boundingBox
                let x = Double(box.origin.x)
                let y = Double(1 - box.origin.y - box.size.height)
                let w = Double(box.size.width)
                let h = Double(box.size.height)
                return (x: clamp01(x), y: clamp01(y), w: clamp01(w), h: clamp01(h))
            }
            .filter { $0.w >= 0.02 && $0.h >= 0.02 }
            .sorted { $0.x < $1.x }
            .prefix(12)
            .map { $0 }
    }

    private static func clamp01(_ value: Double) -> Double {
        min(1, max(0, value))
    }

    private static func cgImageOrientation(from image: UIImage) -> CGImagePropertyOrientation {
        switch image.imageOrientation {
        case .up: return .up
        case .down: return .down
        case .left: return .left
        case .right: return .right
        case .upMirrored: return .upMirrored
        case .downMirrored: return .downMirrored
        case .leftMirrored: return .leftMirrored
        case .rightMirrored: return .rightMirrored
        @unknown default: return .up
        }
    }
}
