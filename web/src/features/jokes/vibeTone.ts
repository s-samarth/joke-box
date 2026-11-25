/**
 * A Vibe's colour, so a set reads at a glance: Riled up red, Bakchod blue, Point prover green,
 * Not sure orange. Keyed by the default options' ids, so a renamed option keeps its colour; an
 * option you add yourself stays neutral. Classes are written out whole for Tailwind to find.
 */
interface Tone { dot: string; chip: string; on: string }

const TONES: Record<string, Tone> = {
  'riled-up': { dot: 'bg-light', chip: 'bg-light/15 text-light ring-1 ring-light/40', on: 'bg-light text-ink font-medium' },
  bakchod: { dot: 'bg-sky', chip: 'bg-sky/15 text-sky ring-1 ring-sky/40', on: 'bg-sky text-ink font-medium' },
  'point-prover': { dot: 'bg-ok', chip: 'bg-ok/15 text-ok ring-1 ring-ok/40', on: 'bg-ok text-ink font-medium' },
}
const NOT_SURE_TONE: Tone = { dot: 'bg-amber', chip: 'bg-amber/15 text-amber', on: 'bg-amber text-ink font-medium' }
const PLAIN: Tone = { dot: 'bg-dim', chip: 'text-paper ring-1 ring-rule-strong', on: 'bg-paper text-ink font-medium' }

/** The tone for an option id; null (unset or deleted) is Not sure. */
export const vibeTone = (id: string | null | undefined): Tone => (id ? (TONES[id] ?? PLAIN) : NOT_SURE_TONE)

/** Generic red (anyone could do it), Non-generic green: a chip and a picked button. */
export const genericTone = (generic: boolean) =>
  generic ? { chip: 'bg-light/15 text-light ring-1 ring-light/40', on: 'bg-light text-ink font-medium' } : { chip: 'bg-ok/15 text-ok ring-1 ring-ok/40', on: 'bg-ok text-ink font-medium' }
