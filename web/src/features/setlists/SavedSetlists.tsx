/** Saved setlists: open, delete, or start a new one. */
import { CalendarDays, ListMusic, MapPin, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { newId } from '../../api/client'
import { useSetlistActions } from '../../api/shows'
import type { Setlist } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { useFeedback } from '../../components/ui/feedbackContext'
import { clock } from '../../lib/duration'
import { formatDate } from '../../lib/time'
import { progress } from './setlistMath'

export function SavedSetlists({ setlists }: { setlists: Setlist[] }) {
  const { remove } = useSetlistActions()
  const { confirm, toast } = useFeedback()

  const onDelete = async (s: Setlist) => {
    if (await confirm({ title: `Delete “${s.name}”?`, message: 'The bits themselves stay in your library.', confirmLabel: 'Delete', danger: true })) {
      remove.mutate(s.id, { onSuccess: () => toast('Setlist deleted') })
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-5 sm:px-6 lg:pt-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">Saved setlists</h1>
        <Link to={`/setlist/${newId()}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-black hover:bg-accent-hover sm:h-10">
          <Plus size={18} /> New setlist
        </Link>
      </div>
      <ul className="space-y-3">
        {setlists.map((s) => {
          const total = s.items.reduce((sum, i) => sum + i.duration_seconds, 0)
          const p = progress(total, s.target_seconds)
          return (
            <li key={s.id} className="flex items-center gap-2 rounded-2xl bg-panel p-2 pl-4 ring-1 ring-line hover:bg-raised">
              <Link to={`/setlist/${s.id}`} className="min-w-0 flex-1 py-2">
                <p className="truncate font-medium">{s.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
                  <span className="inline-flex items-center gap-1"><ListMusic size={12} />{s.items.length} bits</span>
                  <span className={`tabular ${p.over ? 'text-warn' : ''}`}>{clock(total)} / {clock(s.target_seconds)}</span>
                  {s.show_date && <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{formatDate(s.show_date)}</span>}
                  {s.venue_name && <span className="inline-flex items-center gap-1"><MapPin size={12} />{s.venue_name}</span>}
                </p>
              </Link>
              <IconButton label={`Delete ${s.name}`} onClick={() => onDelete(s)} className="hover:text-danger"><Trash2 size={18} /></IconButton>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
