/**
 * A joke's or a premise's Vibe: which side of you it shows. Its options are your persona label
 * field's (the one a set's beats call Dominant persona side: Riled up, Bakchod, Point prover), so
 * there's one list. Stored as `persona`, an option id; unset, or an option since deleted, is Not
 * sure. Generic says whether anyone could do it; unanswered (null) is flagged until you answer.
 */
import { useSetFields } from '../../api/setFields'
import type { SetField } from '../../api/types'

export const NOT_SURE = 'Not sure'
export const VIBE = 'Vibe'

export const personaFieldOf = (fields: SetField[]) => fields.find((f) => f.role === 'persona')

export const usePersonaField = () => personaFieldOf(useSetFields().fields)

/** The option's label, or null for Not sure (unset, deleted, or no persona field). */
export function personaLabel(id: string | null | undefined, field: SetField | undefined): string | null {
  return (id && field?.options.find((o) => o.id === id)?.label) || null
}

/** Generic or Non-generic; null when not answered yet. */
export const genericLabel = (generic: boolean | null | undefined): string | null =>
  generic == null ? null : generic ? 'Generic' : 'Non-generic'
export const GENERIC_ASK = 'Generic?'

/** The Generic filter's choices (?generic=), and what each keeps. */
export const GENERIC_FILTERS = { yes: 'Generic', no: 'Non-generic', unset: 'Generic not answered' } as const
export function matchesGeneric(generic: boolean | null | undefined, filter: string | null | undefined): boolean {
  if (filter === 'yes') return generic === true
  if (filter === 'no') return generic === false
  if (filter === 'unset') return generic == null
  return true
}
