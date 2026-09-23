import Foundation
import Vision
import AppKit

let path = CommandLine.arguments[1]
guard let img = NSImage(contentsOfFile: path),
      let tiff = img.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff),
      let cg = rep.cgImage else {
    fputs("bad image\n", stderr); exit(1)
}
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.usesLanguageCorrection = true
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try handler.perform([req])
let obs = req.results ?? []
var lines: [(String, Float)] = []
for o in obs {
    guard let c = o.topCandidates(1).first else { continue }
    lines.append((c.string, c.confidence))
}
let conf = lines.isEmpty ? 0 : lines.map(\.1).reduce(0,+)/Float(lines.count)
print("CONF \(conf)")
for (s,c) in lines { print(String(format: "%.2f\t%@", c, s)) }
