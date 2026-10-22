/**
 * Colours for type dots. They are hex strings rather than Tailwind classes: Tailwind only builds
 * the classes it finds written in the source, so a colour picked at runtime has to go in `style`.
 */

const HUES = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']
const SOFT = ['#fca5a5', '#fdba74', '#fcd34d', '#fde047', '#bef264', '#86efac', '#6ee7b7', '#5eead4', '#67e8f9', '#7dd3fc', '#93c5fd', '#a5b4fc', '#c4b5fd', '#d8b4fe', '#f0abfc', '#f9a8d4', '#fb7185']
const STRONG = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e']
const NEUTRAL = [['white', '#f1f5f9'], ['silver', '#cbd5e1'], ['stone', '#a8a29e'], ['brown', '#b45309'], ['olive', '#a3a33a'], ['maroon', '#9f1239']]

export interface Swatch {
  name: string
  color: string
}

/** The picker's grid: a soft and a strong shade of every hue, then a few neutrals and earth tones. */
export const SWATCHES: Swatch[] = [
  ...HUES.map((h, i) => ({ name: `Soft ${h}`, color: SOFT[i] })),
  ...HUES.map((h, i) => ({ name: `Strong ${h}`, color: STRONG[i] })),
  ...NEUTRAL.map(([name, color]) => ({ name: name[0].toUpperCase() + name.slice(1), color })),
]

/** The seven common forms, before you've used them. Matches app/services/type_colors.py. */
export const DEFAULT_TYPE_COLORS: Record<string, string> = {
  'one-liner': '#7dd3fc',
  story: '#c4b5fd',
  'crowd work': '#fcd34d',
  roast: '#fb7185',
  observation: '#6ee7b7',
  premise: '#f9a8d4',
  'act out': '#fdba74',
}

/** The order new types are coloured in. Matches AUTO_COLORS in app/services/type_colors.py. */
const AUTO_COLORS = [
  '#fde047', '#5eead4', '#fca5a5', '#93c5fd', '#bef264', '#f0abfc', '#67e8f9', '#d8b4fe', '#86efac',
  '#a5b4fc', '#f97316', '#0ea5e9', '#8b5cf6', '#10b981', '#f43f5e', '#f59e0b', '#ec4899', '#3b82f6',
  '#84cc16', '#14b8a6', '#ef4444', '#eab308', '#a855f7', '#06b6d4', '#22c55e', '#6366f1', '#d946ef',
]

/** A type with no colour yet, such as Undefined. The app's faint grey. */
export const NO_COLOR = '#6f7689'

/** What a brand-new type would be given: the first colour none of your types has. */
export function nextFreeColor(used: Iterable<string>): string {
  const taken = new Set([...used].map((c) => c.toLowerCase()))
  return AUTO_COLORS.find((c) => !taken.has(c)) ?? AUTO_COLORS[taken.size % AUTO_COLORS.length]
}

/** Ink or paper, whichever reads better on top of `hex` (by its relative luminance). */
export function onColor(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? '#151923' : '#ece6da'
}
