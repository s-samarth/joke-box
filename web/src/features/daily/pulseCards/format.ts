/** Small helpers the pulse cards share. */
import type { Step } from '../pulse'

export const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

/** A step's share through, as a whole percent (0 when nothing's in it). */
export const share = (s: Pick<Step, 'done' | 'of'>) => (s.of ? Math.round((s.done / s.of) * 100) : 0)
