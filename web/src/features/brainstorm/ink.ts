/**
 * Drawing pen strokes on a canvas. Strokes are stored on a page 1000 units wide, so the same
 * handwriting fits an iPad, a phone or a laptop: everything is multiplied by `scale` (the
 * canvas's real width / 1000) when drawn.
 */
import type { Stroke } from '../../api/types'

export const PAGE_WIDTH = 1000
/** A blank sheet with A4 proportions, so a whole page fits a phone screen. */
const PAGE_HEIGHT = 1414
/** The server refuses more (one session is saved in one request, and requests have a size cap). */
export const MAX_PAGES = 20

/** All of these show up on the dark page. */
export const INK_COLORS = [
  '#ece6da', '#9ca3af', '#f0cf5a', '#ff9f43', '#ff5a47', '#ff7eb6',
  '#c084fc', '#7aa2ff', '#5fd4e8', '#74d3a8', '#b5e05a', '#c79a6b',
] as const

export const INK_SIZES = [
  { label: 'Fine', size: 1.2 },
  { label: 'Medium', size: 2.4 },
  { label: 'Bold', size: 4 },
  { label: 'Marker', size: 7 },
  { label: 'Thick marker', size: 12 },
] as const

/** Pages are a fixed size; a page drawn before that, which grew past it, keeps all its ink. */
export const pageHeight = (strokes: Stroke[]) =>
  Math.max(PAGE_HEIGHT, ...strokes.flatMap((s) => s.points.map((p) => p[1])))

const pageOf = (s: Stroke) => s.page ?? 0

/** How many pages to show: the saved count, or more if some stroke sits beyond it. */
export const pageCount = (strokes: Stroke[], saved = 1) =>
  Math.max(saved, ...strokes.map((s) => pageOf(s) + 1))

export const strokesOn = (strokes: Stroke[], page: number) => strokes.filter((s) => pageOf(s) === page)

/** Swap one page's strokes for new ones, leaving the other pages alone. */
export const replacePage = (strokes: Stroke[], page: number, next: Stroke[]) =>
  [...strokes.filter((s) => pageOf(s) !== page), ...next]

/** Take the newest stroke off one page. */
export function undoOn(strokes: Stroke[], page: number): Stroke[] {
  const i = strokes.findLastIndex((s) => pageOf(s) === page)
  return i < 0 ? strokes : strokes.toSpliced(i, 1)
}

/** Delete a page: its strokes go and the pages after it move up one. */
export const removePage = (strokes: Stroke[], page: number) =>
  strokes.filter((s) => pageOf(s) !== page).map((s) => (pageOf(s) > page ? { ...s, page: pageOf(s) - 1 } : s))

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
