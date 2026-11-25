/**
 * A Vibe's colour is its persona option's colour (Riled up red, Bakchod blue, Point prover green
 * by default, or what you picked in Edit labels); Not sure is orange. Generic is red, Non-generic green.
 */
import type { CSSProperties } from 'react'
import { filled, optionColor, washed } from '../../lib/labelColors'
import { usePersonaField } from './persona'

export interface Tone { dot: CSSProperties; chip: CSSProperties; on: CSSProperties }

/** The tone for an option id; null (unset or deleted) is Not sure. */
export function useVibeTone(): (id: string | null | undefined) => Tone {
  const field = usePersonaField()
  return (id) => {
    const hex = optionColor(id ? (field?.options.find((o) => o.id === id) ?? { id, label: '' }) : null)
    return { dot: { backgroundColor: hex }, chip: washed(hex), on: filled(hex) }
  }
}

/** Generic red (anyone could do it), Non-generic green: a chip and a picked button. */
export const genericTone = (generic: boolean) =>
  generic ? { chip: 'bg-light/15 text-light ring-1 ring-light/40', on: 'bg-light text-ink font-medium' } : { chip: 'bg-ok/15 text-ok ring-1 ring-ok/40', on: 'bg-ok text-ink font-medium' }
