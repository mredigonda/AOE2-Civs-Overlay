// B: Apple Vision's OCR on the benchmark's boxes (out-ocr/*.png), against truth.json.
// The closest thing on the Mac to Windows' built-in OCR (Windows.Media.Ocr).
//   swift experiments/hud-numbers/ocr_vision.swift experiments/hud-numbers/out-ocr [fast|accurate]
import Foundation
import Vision
import AppKit

let dir = CommandLine.arguments[1]
let accurate = CommandLine.arguments.count > 2 && CommandLine.arguments[2] == "accurate"
let truth = try! JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: dir + "/truth.json"))) as! [String: String]
var ok = 0, total = 0, wrong: [String] = []
var spent = 0.0
for (file, want) in truth.sorted(by: { $0.key < $1.key }) {
    guard let img = NSImage(contentsOfFile: dir + "/" + file),
          let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = accurate ? .accurate : .fast
    req.usesLanguageCorrection = false
    let t0 = Date()
    try? VNImageRequestHandler(cgImage: cg).perform([req])
    spent += Date().timeIntervalSince(t0)
    let got = (req.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined().replacingOccurrences(of: " ", with: "")
    total += 1
    if got == want { ok += 1 } else if wrong.count < 8 { wrong.append("\(file): \(want) -> \(got)") }
}
print(String(format: "B Vision (%@): %d/%d right (%.1f%%), %.1f ms per number", accurate ? "accurate" : "fast", ok, total, 100.0 * Double(ok) / Double(max(total, 1)), spent / Double(max(total, 1)) * 1000))
wrong.forEach { print("  ", $0) }
