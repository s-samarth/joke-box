/** Note cards in a masonry grid: CSS columns, so cards of different heights pack without gaps. */
import type { CraftArea, CraftNote } from '../../api/types'
import { NoteCard } from './NoteCard'

export function NoteGrid({ notes, areas, showArea }: { notes: CraftNote[]; areas: CraftArea[]; showArea?: boolean }) {
  return (
    <div className="columns-1 gap-3 sm:columns-2">
      {notes.map((n) => <NoteCard key={n.id} note={n} areas={areas} showArea={showArea} />)}
    </div>
  )
}
