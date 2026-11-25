import type { SetPiece } from '../../api/types'

/** A joke's colour: a gate is sky blue, locked tape-yellow, loose teal. */
export function tone(p: SetPiece, isGate: boolean) {
  if (isGate) return { text: 'text-sky', border: 'border-sky' }
  return p.loose ? { text: 'text-teal', border: 'border-teal' } : { text: 'text-tape', border: 'border-tape' }
}
