/**
 * Drawing pen strokes on a canvas. The screen's width is 1000 units, so the same handwriting
 * fits an iPad, a phone or a laptop: everything is multiplied by `scale` (the page area's real
 * width / 1000) when drawn. A page is two screens wide (PAGE_SPAN): you see its left half and
 * pan sideways for the rest.
 */
import type { Stroke } from '../../api/types'

export const PAGE_WIDTH = 1000
/** How wide a page is: two screens, for room to write across. */
export const PAGE_SPAN = 2 * PAGE_WIDTH
/** As tall as an A4 sheet one screen wide. */
const PAGE_HEIGHT = 1414
/**
 * New pages stop here: eight double-width pages stay well inside what one save can carry. The
 * server still takes up to 20, so a session from before this keeps saving.
 */
export const MAX_PAGES = 8

/** All of these show up on the dark page. */
export const INK_COLORS = [
  '#ece6da', '#9ca3af', '#f0cf5a', '#ff9f43', '#ff5a47', '#ff7eb6',
  '#c084fc', '#7aa2ff', '#5fd4e8', '#74d3a8', '#b5e05a', '#c79a6b',
] as const

/** The everyday pen colours, one tap away on the toolbar: light (black wouldn't show on the dark page), yellow, red, blue, green. */
export const QUICK_COLORS = [
  { name: 'Light', color: '#ece6da' }, { name: 'Yellow', color: '#f0cf5a' }, { name: 'Red', color: '#ff5a47' },
  { name: 'Blue', color: '#7aa2ff' }, { name: 'Green', color: '#74d3a8' },
] as const

export const INK_SIZES = [
  { label: 'Fine', size: 1.2 },
  { label: 'Medium', size: 2.4 },
  { label: 'Thick', size: 6 },
] as const

/** The closest of the sizes: a pen remembered from when there were five keeps about its width. */
export const nearestSize = (size: number) =>
  INK_SIZES.reduce((best, s) => (Math.abs(s.size - size) < Math.abs(best - size) ? s.size : best), INK_SIZES[1].size as number)

/** How far a page zooms in with two fingers. A double-width page past this would draw blurry (see pixelRatio). */
export const MAX_ZOOM = 2.5
/** Pinched all the way out, the whole double-width page fits the screen. */
export const MIN_ZOOM = PAGE_WIDTH / PAGE_SPAN

/*
 * Safari refuses a canvas much over 16 million pixels, and each one costs 4 bytes of memory. A
 * zoomed page is drawn at a little less than full Retina sharpness to stay under this.
 */
const PIXEL_BUDGET = 12_000_000

/** Pixels per CSS pixel for a canvas this size: the screen's own density, unless that's too big. */
export const pixelRatio = (cssWidth: number, cssHeight: number, dpr: number) =>
  Math.min(dpr, Math.sqrt(PIXEL_BUDGET / Math.max(1, cssWidth * cssHeight)))

/**
 * Where to scroll after a pinch so the spot under your fingers stays under them. `pageX/pageY`
 * is that spot in page units, `scale` the new CSS pixels per page unit, `frameLeft` the page's
 * left edge on screen and `canvasTop` its top in the document.
 */
export function scrollAfterZoom(o: { focusX: number; focusY: number; pageX: number; pageY: number; frameLeft: number; canvasTop: number; scale: number }) {
  return { left: o.pageX * o.scale - (o.focusX - o.frameLeft), top: o.pageY * o.scale + o.canvasTop - o.focusY }
}

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
