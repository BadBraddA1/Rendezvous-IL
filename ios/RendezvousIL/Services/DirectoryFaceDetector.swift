import Vision
import UIKit

enum DirectoryFaceDetector {
    struct Box {
        let x: Double
        let y: Double
        let w: Double
        let h: Double
    }

    /// Normalized face boxes (0–1, top-left origin) for the given JPEG/PNG data.
    static func detectFaces(in imageData: Data) -> [Box] {
        guard let image = UIImage(data: imageData),
              let cgImage = image.cgImage
        else { return [] }

        let request = VNDetectFaceRectanglesRequest()
        let handler = VNImageRequestHandler(
            cgImage: cgImage,
            orientation: cgImageOrientation(from: image),
            options: [:]
        )
        do {
            try handler.perform([request])
        } catch {
            return []
        }

        let observations = request.results ?? []
        var boxes: [Box] = []
        boxes.reserveCapacity(observations.count)

        for observation in observations {
            // Vision boundingBox origin is bottom-left; convert to top-left.
            let visionBox = observation.boundingBox
            let x = clamp01(Double(visionBox.origin.x))
            let y = clamp01(Double(1 - visionBox.origin.y - visionBox.size.height))
            let w = clamp01(Double(visionBox.size.width))
            let h = clamp01(Double(visionBox.size.height))
            guard w >= 0.02, h >= 0.02 else { continue }
            boxes.append(Box(x: x, y: y, w: w, h: h))
        }

        boxes.sort { $0.x < $1.x }
        if boxes.count > 12 {
            return Array(boxes.prefix(12))
        }
        return boxes
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
