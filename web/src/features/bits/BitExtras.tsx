/** A bit's rewrites (Studio sessions) and the sets it's in, with a quick "add to set". */
import { PenLine, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { newId } from '../../api/client'
import { useBrainstorms, useSetlistActions, useSetlists } from '../../api/shows'
import type { Bit } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { SectionHead } from '../../components/ui/bits'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Dropdown } from '../../components/ui/Menu'
import { formatDate } from '../../lib/time'
import { setlistInput } from '../sets/setlistInput'

const words = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0)

export function BitExtras({ bit }: { bit: Bit }) {
  const { data: brainstorms = [] } = useBrainstorms()
  const { data: sets = [] } = useSetlists()
  const { save } = useSetlistActions()
  const { toast } = useFeedback()
  const navigate = useNavigate()
  const rewrites = brainstorms.filter((b) => b.bit_id === bit.id)
  const inSets = sets.filter((s) => s.items.some((i) => i.bit_id === bit.id))
  const otherSets = sets.filter((s) => !inSets.includes(s))

  const addTo = (setId: string | null) => {
    const target = sets.find((s) => s.id === setId)
    const id = target?.id ?? newId()
    const base = target ? setlistInput(target) : { name: 'Untitled set', show_date: null, target_seconds: 420, venue_name: null, items: [] }
    save.mutateAsync({ id, input: { ...base, items: [...base.items, { bit_id: bit.id, duration_seconds: bit.duration_seconds }] } })
      .catch((e: Error) => toast(`Not added: ${e.message}`))
    toast(`Added to ${base.name}`, { label: 'Open set', onClick: () => navigate(`/sets/${id}`) })
  }

  return (
    <div className="grid gap-10 sm:grid-cols-2">
      <section>
        <SectionHead title="Rewrites" />
        {rewrites.length === 0 ? (
          <p className="mb-3 text-[15px] text-dim">Rework it with a timer running. Each save keeps a version.</p>
        ) : (
          <ul className="mb-3 divide-y divide-rule border-y border-rule">
            {rewrites.map((r) => (
              <li key={r.id}>
                <Link to={`/bits/${bit.id}/rewrite?session=${r.id}`} className="flex items-baseline justify-between gap-3 py-3 hover:bg-ink-2/60">
                  <span className="truncate">{r.title || 'Untitled session'}</span>
                  <span className="shrink-0 text-sm text-faint">{words(r.content)} words, {formatDate(r.updated_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link to={`/bits/${bit.id}/rewrite`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink-3 px-3 text-[15px] hover:bg-ink-4">
          <PenLine size={16} /> Start a rewrite
        </Link>
      </section>
      <section>
        <SectionHead title="In sets" />
        {inSets.length === 0 ? (
          <p className="mb-3 text-[15px] text-dim">Not in any set yet.</p>
        ) : (
          <ul className="mb-3 divide-y divide-rule border-y border-rule">
            {inSets.map((s) => (
              <li key={s.id}>
                <Link to={`/sets/${s.id}`} className="flex items-baseline justify-between gap-3 py-3 hover:bg-ink-2/60">
                  <span className="truncate">{s.name}</span>
                  <span className="shrink-0 text-sm text-faint">{s.show_date ? formatDate(s.show_date) : 'No date'}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Dropdown
          align="start"
          items={[...otherSets.map((s) => ({ label: s.name, onSelect: () => addTo(s.id) })), ...(otherSets.length ? ['divider' as const] : []), { label: 'A new set', icon: <Plus size={16} />, onSelect: () => addTo(null) }]}
          trigger={<span><Button icon={<Plus size={16} />}>Add to a set</Button></span>}
        />
      </section>
    </div>
  )
}
