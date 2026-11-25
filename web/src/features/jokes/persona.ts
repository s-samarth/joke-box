/**
 * A joke's persona: which side of you it shows. Its options are your persona label field's (the
 * one a set's beats call Dominant persona side), so you keep one list in Label fields. A joke
 * with none, or with an option since deleted, is Not sure.
 */
import { useSetFields } from '../../api/setFields'
import type { SetField } from '../../api/types'

export const NOT_SURE = 'Not sure'

export const personaFieldOf = (fields: SetField[]) => fields.find((f) => f.role === 'persona')

export const usePersonaField = () => personaFieldOf(useSetFields().fields)

/** The option's label, or null for Not sure (unset, deleted, or no persona field). */
export function personaLabel(id: string | null | undefined, field: SetField | undefined): string | null {
  return (id && field?.options.find((o) => o.id === id)?.label) || null
}
