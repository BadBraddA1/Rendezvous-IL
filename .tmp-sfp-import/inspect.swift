
import Vision
import AppKit
import Foundation
import PDFKit

let path = CommandLine.arguments[1]
guard let doc = PDFDocument(url: URL(fileURLWithPath: path)) else {
  fputs("{\"error\":\"open failed\"}\n", stderr)
  exit(1)
}

func render(_ pageIndex: Int) -> CGImage? {
  guard let page = doc.page(at: pageIndex) else { return nil }
  let bounds = page.bounds(for: .mediaBox)
  let scale: CGFloat = 2
  let size = CGSize(width: bounds.width * scale, height: bounds.height * scale)
  let img = NSImage(size: size)
  img.lockFocus()
  if let ctx = NSGraphicsContext.current?.cgContext {
    ctx.setFillColor(NSColor.white.cgColor)
    ctx.fill(CGRect(origin: .zero, size: size))
    ctx.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: ctx)
  }
  img.unlockFocus()
  guard let tiff = img.tiffRepresentation,
        let rep = NSBitmapImageRep(data: tiff) else { return nil }
  return rep.cgImage
}

func inkRatio(_ pageIndex: Int) -> Double {
  guard let cg = render(pageIndex) else { return -1 }
  let rep = NSBitmapImageRep(cgImage: cg)
  var dark = 0, total = 0
  for y in stride(from: 0, to: rep.pixelsHigh, by: 6) {
    for x in stride(from: 0, to: rep.pixelsWide, by: 6) {
      guard let c = rep.colorAt(x: x, y: y) else { continue }
      total += 1
      let L = 0.299*c.redComponent + 0.587*c.greenComponent + 0.114*c.blueComponent
      if L < 0.85 { dark += 1 }
    }
  }
  return total > 0 ? Double(dark)/Double(total) : -1
}

func ocr(_ pageIndex: Int) -> String {
  guard let cg = render(pageIndex) else { return "" }
  let req = VNRecognizeTextRequest()
  req.recognitionLevel = .accurate
  let handler = VNImageRequestHandler(cgImage: cg, options: [:])
  try? handler.perform([req])
  return (req.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: " ")
}

var verses = Set<Int>()
let pattern = try! NSRegularExpression(pattern: #"(?:^|\s)([1-9])\.\s+[A-Za-z]"#)
for i in 0..<doc.pageCount {
  let text = ocr(i)
  let ns = text as NSString
  for m in pattern.matches(in: text, range: NSRange(location: 0, length: ns.length)) {
    if let n = Int(ns.substring(with: m.range(at: 1))) { verses.insert(n) }
  }
}
let ink0 = inkRatio(0)
let payload: [String: Any] = [
  "pages": doc.pageCount,
  "ink0": ink0,
  "hasNativeTitle": ink0 >= 0 && ink0 < 0.04,
  "verseCount": verses.max() ?? 0,
]
let data = try! JSONSerialization.data(withJSONObject: payload)
FileHandle.standardOutput.write(data)
print("")
