/**
 * Bird's eye view (docs/sets.md): the whole set from above. A time strip runs across the top, drawn
 * to scale against the slot, and a board under it has one column per beat. Pure functions, tested
 * in birdsEye.test.ts.
 *
 * Only beats have time. Blocks and jokes inside a beat have an order, never a time of their own,
 * so the strip gives each of them an equal slot inside its beat: their widths say nothing about
 * how long they run.
 */
import type { Beat, SetEntry, SetPiece } from '../../api/types'
import { hasPieces } from './beats'
import { fitGates } from './gateRows'

/** Where on the clock each beat starts, from the beats' own times. */
export const starts = (beats: Beat[]) => beats.map((_, i) => beats.slice(0, i).reduce((sum, b) => sum + b.seconds, 0))

/** Each joke's number in the set's running order, by piece id: 1, 2, 3… across every beat. */
export function numbers(beats: Beat[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const b of beats) for (const e of b.entries) if (hasPieces(e)) for (const p of e.pieces) out.set(p.id, out.size + 1)
  return out
}

/** How many gates each joke sits inside (0, 1 or 2), with gates fitted as the builder reads them. */
export function depths(pieces: SetPiece[]): number[] {
  const open: number[] = []
  return fitGates(pieces).map((p, i) => {
    while (open.length && open[open.length - 1] < i) open.pop()
    const depth = open.length
    if (p.gate) open.push(i + p.gate)
    return depth
  })
}

/** One mark on the strip's joke lane: a joke, or a crowd work question. `x` is its centre. */
export interface Mark { key: string; x: number; piece?: SetPiece; question?: string }
/** A gate's bracket over the jokes it guards, from its own joke to the last one inside. */
export interface Span { key: string; from: number; to: number; depth: number; n: number }
export interface StripBlock { entry: SetEntry; x: number; w: number; marks: Mark[]; spans: Span[] }
export interface StripBeat { beat: Beat; index: number; x: number; w: number; start: number }
export interface Strip { beats: StripBeat[]; blocks: StripBlock[]; width: number; ticks: number[] }

const slots = (e: SetEntry) => Math.max(1, hasPieces(e) ? e.pieces.length : e.questions.length)

/** Ticks every minute, or every five when minutes would sit closer than `minGap` pixels. */
export function ticks(seconds: number, pxPerSecond: number, minGap = 44): number[] {
  const step = 60 * pxPerSecond >= minGap ? 60 : 300
  const out: number[] = []
  for (let s = 0; s <= seconds; s += step) out.push(s)
  return out
}

/**
 * The strip, `pxPerSecond` wide per second of beat time. The scale runs to the slot or the beats,
 * whichever is longer. Inside a beat, every joke and question gets an equal slot in running order,
 * and a block is as wide as its slots: order only, never time.
 */
export function stripLayout(beats: Beat[], slotSeconds: number, pxPerSecond: number, number: Map<string, number>): Strip {
  const at = starts(beats)
  const total = beats.reduce((s, b) => s + b.seconds, 0)
  const span = Math.max(slotSeconds, total)
  const out: Strip = { beats: [], blocks: [], width: span * pxPerSecond, ticks: ticks(span, pxPerSecond) }
  beats.forEach((beat, index) => {
    const x = at[index] * pxPerSecond
    const w = beat.seconds * pxPerSecond
    out.beats.push({ beat, index, x, w, start: at[index] })
    const all = beat.entries.reduce((n, e) => n + slots(e), 0)
    const slot = all ? w / all : 0
    let left = x
    for (const entry of beat.entries) {
      const bw = slots(entry) * slot
      const mark = (i: number) => left + (i + 0.5) * slot
      const block: StripBlock = { entry, x: left, w: bw, marks: [], spans: [] }
      if (hasPieces(entry)) {
        const fitted = fitGates(entry.pieces)
        const deep = depths(entry.pieces)
        fitted.forEach((p, i) => {
          block.marks.push({ key: p.id, x: mark(i), piece: p })
          if (p.gate) block.spans.push({ key: p.id, from: mark(i), to: mark(i + p.gate), depth: deep[i], n: number.get(p.id) ?? 0 })
        })
      } else {
        entry.questions.forEach((q, i) => block.marks.push({ key: q.id, x: mark(i), question: q.text }))
      }
      out.blocks.push(block)
      left += bw
    }
  })
  return out
}

/** The board's columns and the gaps between them, in pixels at 100%. */
export const COLUMN = 300
export const GUTTER = 44
export const boardWidth = (beats: number) => Math.max(0, beats * COLUMN + (beats - 1) * GUTTER)

/** Pixels per second so the strip is about as wide as the board under it, and never too narrow. */
export const scaleFor = (boardWidth: number, seconds: number, minWidth = 720) =>
  seconds > 0 ? Math.max(boardWidth, minWidth) / seconds : 1

/** A zoom step, kept between a quarter size and three times. */
export const clampZoom = (z: number) => Math.min(3, Math.max(0.25, Math.round(z * 100) / 100))
