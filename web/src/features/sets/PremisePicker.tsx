/**
 * Pick a premise for a beat: search your premises, tap one. Its jokes aren't added with it, so
 * you choose which ones and in what order: the joke picker opens next. Discarded premises stay
 * out of the list.
 */
import { Search } from 'lucide-react'
import { useState } from 'react'
import { usePremises } from '../../api/premises'
import { Input } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  used: Set<string>
  onPick: (premiseId: string) => void
}

export function PremisePicker({ open, onOpenChange, used, onPick }: Props) {
  const { data: premises = [] } = usePremises()
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const shown = premises
    .filter((p) => p.status !== 'Discarded' && (!needle || `${p.take} ${p.notes}`.toLowerCase().includes(needle)))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add a premise" description="The take this part of the beat rests on. You add its jokes next.">
      <div className="relative mb-3">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
        <Input type="search" aria-label="Search premises" placeholder="Search premises" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ul className="divide-y divide-rule">
        {shown.length === 0 && <li className="py-6 text-dim">{premises.length ? 'No premises match.' : 'No premises yet. Write one in Premises first.'}</li>}
        {shown.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onPick(p.id)} className="w-full py-3 text-left hover:text-tape">
              <p className="leading-snug font-medium">{p.take}</p>
              {p.notes && <p className="mt-0.5 line-clamp-2 text-sm text-dim">{p.notes}</p>}
              {used.has(p.id) && <p className="mt-1 text-[13px] text-amber">Already in this beat</p>}
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
