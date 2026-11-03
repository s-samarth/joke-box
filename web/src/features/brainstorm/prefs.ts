/** What a brainstorm session remembers on this device: typing or handwriting, the pen, and full screen. */
import { INK_COLORS, INK_SIZES, nearestSize } from './ink'

export type Mode = 'type' | 'write'

const MODE_KEY = 'jokebox.brainstorm.mode'
const PEN_KEY = 'jokebox.brainstorm.pen'
const FOCUS_KEY = 'jokebox.brainstorm.focus'

const read = (key: string) => { try { return localStorage.getItem(key) } catch { return null } }
const write = (key: string, value: string) => { try { localStorage.setItem(key, value) } catch { /* private mode */ } }

export const savedMode = (): Mode => (read(MODE_KEY) === 'write' ? 'write' : 'type')
export const saveMode = (mode: Mode) => write(MODE_KEY, mode)

export type Pen = { color: string; size: number }
const DEFAULT_PEN: Pen = { color: INK_COLORS[0], size: INK_SIZES[1].size }

/** The last pen colour and size you picked. */
export function savedPen(): Pen {
  try {
    const pen = JSON.parse(read(PEN_KEY) ?? '{}') as Partial<Pen>
    return {
      color: INK_COLORS.find((c) => c === pen.color) ?? DEFAULT_PEN.color,
      size: typeof pen.size === 'number' ? nearestSize(pen.size) : DEFAULT_PEN.size,
    }
  } catch { return DEFAULT_PEN }
}
export const savePen = (pen: Pen) => write(PEN_KEY, JSON.stringify(pen))

/** Handwriting full screen (only the tools and the page), so the iPad works like a notebook. */
export const savedFocus = () => read(FOCUS_KEY) === '1'
export const saveFocus = (on: boolean) => write(FOCUS_KEY, on ? '1' : '0')
