/**
 * Drawing pen strokes on a canvas. Strokes are stored on a page 1000 units wide, so the same
 * handwriting fits an iPad, a phone or a laptop: everything is multiplied by `scale` (the
 * canvas's real width / 1000) when drawn.
 */
import type { Stroke } from '../../api/types'

export const PAGE_WIDTH = 1000
const MIN_PAGE_HEIGHT = 1300
const ROOM_BELOW = 500
/** Space between the faint ruled lines, in page units. */
export const LINE_GAP = 56

export const INK_COLORS = ['#ece6da', '#f0cf5a', '#ff5a47', '#74d3a8'] as const

/** The page grows as you write lower, always leaving some blank room below. */
export const pageHeight = (strokes: Stroke[]) =>
  Math.max(MIN_PAGE_HEIGHT, ...strokes.flatMap((s) => s.points.map((p) => p[1] + ROOM_BELOW)))

type Point = Stroke['points'][number]
const mid = (a: Point, b: Point): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]

/** Harder pencil pressure gives a thicker line. Mice report no pressure, so they get 0.5. */
const widthAt = (s: Stroke, p: Point, scale: number) => s.size * (0.4 + p[2] * 1.2) * scale

/**
 * Draws the piece of stroke ending at point i. Each piece is a curve between the midpoints of
 * neighbouring points, which turns a jagged run of samples into smooth handwriting.
 */
export function drawSegment(ctx: CanvasRenderingContext2D, s: Stroke, i: number, scale: number) {
  const pts = s.points
  if (i < 1) return
  const start = i >= 2 ? mid(pts[i - 2], pts[i - 1]) : pts[i - 1]
  const end = mid(pts[i - 1], pts[i])
  ctx.beginPath()
  ctx.strokeStyle = s.color
  ctx.lineWidth = widthAt(s, pts[i], scale)
  ctx.moveTo(start[0] * scale, start[1] * scale)
  ctx.quadraticCurveTo(pts[i - 1][0] * scale, pts[i - 1][1] * scale, end[0] * scale, end[1] * scale)
  ctx.stroke()
}

export function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, scale: number) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const pts = s.points
  if (pts.length === 1) {
    ctx.beginPath()
    ctx.fillStyle = s.color
    ctx.arc(pts[0][0] * scale, pts[0][1] * scale, widthAt(s, pts[0], scale) / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  for (let i = 1; i < pts.length; i++) drawSegment(ctx, s, i, scale)
  // Close the small gap between the last midpoint and the final point.
  const last = pts[pts.length - 1]
  const tail = mid(pts[pts.length - 2], last)
  ctx.beginPath()
  ctx.lineWidth = widthAt(s, last, scale)
  ctx.moveTo(tail[0] * scale, tail[1] * scale)
  ctx.lineTo(last[0] * scale, last[1] * scale)
  ctx.stroke()
}

/** The eraser removes whole strokes it touches, like the stroke eraser in Notes. */
export function eraseAt(strokes: Stroke[], x: number, y: number, radius = 14): Stroke[] {
  const hit = (s: Stroke) => s.points.some((p) => (p[0] - x) ** 2 + (p[1] - y) ** 2 <= (radius + s.size) ** 2)
  return strokes.some(hit) ? strokes.filter((s) => !hit(s)) : strokes
}
