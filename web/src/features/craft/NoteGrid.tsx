/**
 * Note cards in two columns. Search results pack as masonry (CSS columns, no gaps). An area's
 * notes are numbered, so they go in rows instead: 01 and 02 side by side, read left to right.
 */
import type { CraftArea, CraftNote } from '../../api/types'
import { NoteCard } from './NoteCard'

export function NoteGrid({ notes, areas, showArea, numbered }: { notes: CraftNote[]; areas: CraftArea[]; showArea?: boolean; numbered?: boolean }) {
  return (
    <div className={numbered ? 'grid items-start gap-x-3 sm:grid-cols-2' : 'columns-1 gap-3 sm:columns-2'}>
      {notes.map((n, i) => <NoteCard key={n.id} note={n} areas={areas} showArea={showArea} index={numbered ? i : undefined} />)}
    </div>
  )
}
