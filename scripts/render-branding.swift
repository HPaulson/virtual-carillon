import AppKit
import CoreGraphics
import CoreText
import Foundation
import ImageIO

let navy = CGColor(red: 16.0 / 255.0, green: 36.0 / 255.0, blue: 59.0 / 255.0, alpha: 1)
let gold = CGColor(red: 242.0 / 255.0, green: 199.0 / 255.0, blue: 92.0 / 255.0, alpha: 1)
let ivory = CGColor(red: 1, green: 250.0 / 255.0, blue: 240.0 / 255.0, alpha: 1)

struct Output {
  let path: String
  let width: Int
  let height: Int
}

let outputs = [
  Output(path: "homeassistant/app/icon.png", width: 128, height: 128),
  Output(path: "homeassistant/app/logo.png", width: 250, height: 100),
  Output(path: "homeassistant/integration/virtual_carillon/brand/icon.png", width: 256, height: 256),
  Output(path: "homeassistant/integration/virtual_carillon/brand/icon@2x.png", width: 512, height: 512),
  Output(path: "homeassistant/integration/virtual_carillon/brand/logo.png", width: 640, height: 256),
  Output(path: "homeassistant/integration/virtual_carillon/brand/logo@2x.png", width: 1280, height: 512),
]

func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x, y: y) }

func bellPath() -> CGPath {
  let path = CGMutablePath()
  path.move(to: point(128, 42))
  path.addCurve(to: point(79, 92), control1: point(101, 42), control2: point(79, 64))
  path.addLine(to: point(79, 122))
  path.addCurve(to: point(60, 170), control1: point(79, 141), control2: point(73, 156))
  path.addLine(to: point(53, 178))
  path.addCurve(to: point(60, 192), control1: point(48, 184), control2: point(52, 192))
  path.addLine(to: point(196, 192))
  path.addCurve(to: point(203, 178), control1: point(208, 192), control2: point(208, 184))
  path.addLine(to: point(196, 170))
  path.addCurve(to: point(177, 122), control1: point(183, 156), control2: point(177, 141))
  path.addLine(to: point(177, 92))
  path.addCurve(to: point(128, 42), control1: point(177, 64), control2: point(155, 42))
  path.closeSubpath()
  return path
}

func roundedLine(_ context: CGContext, from: CGPoint, to: CGPoint, width: CGFloat, color: CGColor) {
  context.setStrokeColor(color)
  context.setLineWidth(width)
  context.setLineCap(.round)
  context.beginPath()
  context.move(to: from)
  context.addLine(to: to)
  context.strokePath()
}

func drawMark(_ context: CGContext) {
  context.setFillColor(navy)
  context.fillEllipse(in: CGRect(x: 8, y: 8, width: 240, height: 240))

  context.setStrokeColor(CGColor(red: 242.0 / 255.0, green: 199.0 / 255.0, blue: 92.0 / 255.0, alpha: 0.24))
  context.setLineWidth(2)
  context.strokeEllipse(in: CGRect(x: 17, y: 17, width: 222, height: 222))

  context.setFillColor(gold)
  context.addPath(bellPath())
  context.fillPath()

  roundedLine(context, from: point(82, 181), to: point(174, 181), width: 7, color: navy)
  let clapper = CGMutablePath()
  clapper.move(to: point(112, 196))
  clapper.addCurve(to: point(128, 211), control1: point(115, 206), control2: point(121, 211))
  clapper.addCurve(to: point(144, 196), control1: point(135, 211), control2: point(141, 206))
  context.setStrokeColor(gold)
  context.setLineWidth(9)
  context.setLineCap(.round)
  context.addPath(clapper)
  context.strokePath()

  // A Latin cross: the lower stem is intentionally longer than the upper arm.
  roundedLine(context, from: point(128, 61), to: point(128, 138), width: 11, color: navy)
  roundedLine(context, from: point(104, 88), to: point(152, 88), width: 11, color: navy)

}

func drawWordmark(_ context: CGContext) {
  let card = CGRect(x: 286, y: 72, width: 332, height: 111)
  context.setFillColor(ivory)
  context.addPath(roundedRectPath(card, radius: 26))
  context.fillPath()
  context.setStrokeColor(CGColor(red: 16.0 / 255.0, green: 36.0 / 255.0, blue: 59.0 / 255.0, alpha: 0.12))
  context.setLineWidth(2)
  context.addPath(roundedRectPath(card, radius: 26))
  context.strokePath()

  let font = CTFontCreateWithName("Helvetica Neue" as CFString, 39, nil)
  let attributes: [NSAttributedString.Key: Any] = [
    NSAttributedString.Key(kCTFontAttributeName as String): font,
    NSAttributedString.Key(kCTForegroundColorAttributeName as String): navy,
  ]
  let line = CTLineCreateWithAttributedString(NSAttributedString(string: "Virtual Carillon", attributes: attributes))
  context.textPosition = point(307, 117)
  CTLineDraw(line, context)
  roundedLine(context, from: point(308, 98), to: point(522, 98), width: 6, color: CGColor(red: 211.0 / 255.0, green: 155.0 / 255.0, blue: 42.0 / 255.0, alpha: 1))
}

func roundedRectPath(_ rect: CGRect, radius: CGFloat) -> CGPath {
  CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)
}

func writePNG(_ output: Output) {
  guard let context = CGContext(
    data: nil,
    width: output.width,
    height: output.height,
    bitsPerComponent: 8,
    bytesPerRow: output.width * 4,
    space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
  ) else { fatalError("Could not create bitmap context") }

  context.clear(CGRect(x: 0, y: 0, width: output.width, height: output.height))
  let scale = CGFloat(output.height) / 256
  context.saveGState()
  context.scaleBy(x: scale, y: scale)
  context.saveGState()
  context.translateBy(x: 0, y: 256)
  context.scaleBy(x: 1, y: -1)
  drawMark(context)
  context.restoreGState()
  if output.width > 256 {
    drawWordmark(context)
  }
  context.restoreGState()

  guard let image = context.makeImage() else { fatalError("Could not create image") }
  let url = URL(fileURLWithPath: output.path)
  guard let destination = CGImageDestinationCreateWithURL(url as CFURL, "public.png" as CFString, 1, nil) else {
    fatalError("Could not create PNG destination for \(output.path)")
  }
  CGImageDestinationAddImage(destination, image, nil)
  guard CGImageDestinationFinalize(destination) else { fatalError("Could not write \(output.path)") }
}

for output in outputs {
  writePNG(output)
}
