/** A Vibe's colour as a small dot, beside its name in menus, pickers and the peek. */
import { vibeTone } from './vibeTone'

export function VibeDot({ id }: { id: string | null | undefined }) {
  return <span aria-hidden className={`inline-block size-2.5 shrink-0 rounded-full ${vibeTone(id).dot}`} />
}
