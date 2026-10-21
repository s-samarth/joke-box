/** One area, opened like a folder: its notes as cards, with New note and Edit area. */
import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useCraftAreas, useCraftNotes } from '../../api/craft'
import { Button } from '../../components/ui/Button'
import { EmptyState, Spinner } from '../../components/ui/bits'
import { AreaSheet } from './AreaSheet'
import { AREA_COLORS } from './craftMeta'
import { NoteGrid } from './NoteGrid'

export function AreaPage() {
  const { areaId } = useParams()
  const { data: notes = [], isPending } = useCraftNotes()
  const { data: areas = [], isPending: areasPending } = useCraftAreas()
  const [editing, setEditing] = useState(false)
  const navigate = useNavigate()
  if (isPending || areasPending) return <div className="py-16"><Spinner /></div>
  const area = areas.find((a) => a.id === areaId)
  if (!area) return <EmptyState title="Area not found" action={<Link to="/craft" className="text-tape">Back to Craft</Link>}>It may have been deleted.</EmptyState>
  const inArea = notes.filter((n) => n.area_id === area.id)
  const newNote = (
    <Link to={`/craft/new?area=${area.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-tape px-3 text-sm font-semibold text-tape-ink hover:bg-[#f5da77]"><Plus size={16} /> New note</Link>
  )

  return (
    <div className="mx-auto max-w-3xl pb-16" style={{ '--area': AREA_COLORS[area.color] } as CSSProperties}>
      <div className="pt-6 pb-6 lg:pt-10">
        <Link to="/craft" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-paper"><ArrowLeft size={15} /> Craft</Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 border-l-4 border-[var(--area)] pl-4">
            <h1 className="headline text-[44px] leading-none sm:text-[56px]">{area.name}</h1>
            {area.description && <p className="mt-2 text-dim">{area.description}</p>}
          </div>
          <div className="flex shrink-0 gap-1 sm:pb-1">
            <Button variant="quiet" small icon={<Pencil size={15} />} onClick={() => setEditing(true)}>Edit area</Button>
            {inArea.length > 0 && newNote}
          </div>
        </div>
      </div>
      {inArea.length ? <NoteGrid notes={inArea} areas={areas} /> : (
        <EmptyState title="Nothing here yet" action={newNote}>Add a note, or move one in from another area with its ⋯ menu.</EmptyState>
      )}
      {editing && <AreaSheet area={area} areas={areas} noteCount={inArea.length} onClose={() => setEditing(false)} onDeleted={(to) => navigate(`/craft/area/${to}`, { replace: true })} />}
    </div>
  )
}
