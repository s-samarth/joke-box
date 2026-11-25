/**
 * Colours for set label options (Status, Dominant persona side, Tone, Voice fit and your own).
 * Each option stores a hex `color`; one saved before colours existed gets its default by id here
 * (the same map is in app/services/set_fields.py, which fills it in on the way out). Not sure is
 * always amber. Hex rather than Tailwind classes, since a colour you pick only exists at runtime.
 */
import type { CSSProperties } from 'react'
import type { SetFieldOption } from '../api/types'
import { onColor } from './typeColors'

export const NOT_SURE_COLOR = '#ffb547' // amber
export const PLAIN_COLOR = '#8b91a3' // faint

/** Status runs green (I win) to red (I lose); Tone matches each word; Voice fit fades to stone. */
export const DEFAULT_OPTION_COLORS: Record<string, string> = {
  'i-win': '#74d3a8', mixed: '#bef264', neutral: '#93c5fd', 'we-lose': '#fca5a5', 'i-lose': '#ff5a47',
  'riled-up': '#ff5a47', bakchod: '#9db4ff', 'point-prover': '#74d3a8',
  opinionated: '#c4b5fd', playful: '#67e8f9', edgy: '#f43f5e', heartfelt: '#f9a8d4',
  mine: '#74d3a8', half: '#bef264', anyones: '#a8a29e',
}

/** The picker's swatches: the app's own colours and a few close to them. No amber (Not sure's) or tape yellow (the accent). */
export const LABEL_PALETTE = Object.entries({
  Green: '#74d3a8', Lime: '#bef264', Teal: '#6fd6d0', Cyan: '#67e8f9', Blue: '#93c5fd', Periwinkle: '#9db4ff', Violet: '#c4b5fd',
  Orchid: '#e7a3e0', Pink: '#f9a8d4', 'Soft red': '#fca5a5', Rose: '#f43f5e', Red: '#ff5a47', Stone: '#a8a29e', Silver: '#cbd5e1',
}).map(([name, color]) => ({ name, color }))

/** A new option's colour: the first swatch its field isn't using yet. */
export function nextLabelColor(options: SetFieldOption[]): string {
  const used = new Set(options.map((o) => optionColor(o).toLowerCase()))
  return (LABEL_PALETTE.find((s) => !used.has(s.color)) ?? LABEL_PALETTE[options.length % LABEL_PALETTE.length]).color
}

/** An option's colour; no option (unset or deleted) is Not sure's amber. */
export function optionColor(o: SetFieldOption | null | undefined): string {
  if (!o) return NOT_SURE_COLOR
  return o.color ?? DEFAULT_OPTION_COLORS[o.id] ?? PLAIN_COLOR
}

/** Picked: filled with the colour, ink or paper text on it. */
export const filled = (hex: string): CSSProperties => ({ backgroundColor: hex, color: onColor(hex) })
/** A quiet chip: a wash of the colour, its text, and a thin ring. */
export const washed = (hex: string): CSSProperties => ({ backgroundColor: `${hex}26`, color: hex, boxShadow: `inset 0 0 0 1px ${hex}66` })
