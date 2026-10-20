/** Your sets, soonest show first. "New set" creates one and opens it straight away. */
import { MoreHorizontal, Play, Plus, Printer, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { newId } from '../../api/client'
import { useSetlistActions, useSetlists } from '../../api/shows'
import type { Setlist } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { EmptyState, PageHead, Spinner } from '../../components/ui/bits'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Dropdown } from '../../components/ui/Menu'
import { formatDate, todayIst } from '../../lib/time'
import { LightBar } from './LightBar'

const total = (s: Setlist) => s.items.reduce((sum, i) => sum + i.duration_seconds, 0)

export function SetsPage() {
  const { data: sets = [], isPending } = useSetlists()
  const { save, remove } = useSetlistActions()
  const { confirm, toast } = useFeedback()
  const navigate = useNavigate()
  const today = todayIst()
  const sorted = [...sets].sort((a, b) => {
    const [ua, ub] = [a.show_date && a.show_date >= today, b.show_date && b.show_date >= today]
    if (ua !== ub) return ua ? -1 : 1
    return ua ? a.show_date!.localeCompare(b.show_date!) : b.updated_at.localeCompare(a.updated_at)
  })

  const create = () => {
    const id = newId()
    save.mutate({ id, input: { name: 'Untitled set', show_date: today, target_seconds: 420, venue_name: null, items: [] } }, { onSuccess: () => navigate(`/sets/${id}`) })
  }
  const onDelete = async (s: Setlist) => {
    if (await confirm({ title: `Delete ${s.name}?`, message: 'The bits stay in your library.', confirmLabel: 'Delete set', danger: true })) remove.mutate(s.id, { onSuccess: () => toast('Set deleted') })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Sets"><Button variant="tape" icon={<Plus size={18} />} onClick={create} disabled={save.isPending}>New set</Button></PageHead>
      {isPending && !sets.length ? (
        <Spinner />
      ) : sorted.length === 0 ? (
        <EmptyState title="No sets yet">Got a spot coming up? Make a set, drop your bits in, and see if it fits the slot.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {sorted.map((s) => (
            <li key={s.id} className="rounded-xl bg-ink-2 p-4 ring-1 ring-rule">
              <div className="flex items-start gap-2">
                <Link to={`/sets/${s.id}`} className="min-w-0 flex-1">
                  <p className="headline truncate text-[26px]">{s.name}</p>
                  <p className="mt-1 text-sm text-dim">
                    {[s.show_date && formatDate(s.show_date), s.venue_name, `${s.items.length} bits`].filter(Boolean).join(', ')}
                  </p>
                </Link>
                <Link to={`/sets/${s.id}/stage`} aria-label={`Rehearse ${s.name}`} className="inline-flex size-10 items-center justify-center rounded-lg bg-ink-3 text-paper hover:bg-ink-4"><Play size={17} /></Link>
                <Dropdown items={[
                  { label: 'Print', icon: <Printer size={16} />, onSelect: () => navigate(`/sets/${s.id}/print`) },
                  { label: 'Delete set', icon: <Trash2 size={16} />, danger: true, onSelect: () => onDelete(s) },
                ]} trigger={<IconButton label="More"><MoreHorizontal size={18} /></IconButton>} />
              </div>
              <div className="mt-4"><LightBar total={total(s)} target={s.target_seconds} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
