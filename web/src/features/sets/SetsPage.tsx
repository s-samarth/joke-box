/**
 * Your sets, soonest show first, with their rating and tags; the chips show only sets with a tag.
 * "New set" creates one and opens it straight away.
 */
import { MoreHorizontal, Play, Plus, Printer, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { newId } from '../../api/client'
import { useSetTags } from '../../api/setTags'
import { useSetlistActions, useSetlists } from '../../api/shows'
import type { Setlist } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { EmptyState, PageHead, Spinner, Stars } from '../../components/ui/pieces'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Dropdown } from '../../components/ui/Menu'
import { clock } from '../../lib/duration'
import { tagChip } from './chips'
import { LightBar } from './LightBar'
import { draftItems, optionalSeconds, totalSeconds } from './setlistMath'

export function SetsPage() {
  const { data: sets = [], isPending } = useSetlists()
  const { data: tags = [] } = useSetTags()
  const [tag, setTag] = useState<string | null>(null)
  const tagName = new Map(tags.map((t) => [t.id, t.name]))
  const used = tags.filter((t) => sets.some((s) => s.tag_ids?.includes(t.id)))
  const showing = tag && used.some((t) => t.id === tag) ? tag : null
  const { save, remove } = useSetlistActions()
  const { confirm, toast } = useFeedback()
  const navigate = useNavigate()
  const sorted = sets.filter((s) => !showing || s.tag_ids?.includes(showing)).sort((a, b) => b.updated_at.localeCompare(a.updated_at))

  const create = () => {
    const id = newId()
    // Shown at once and saved in the background (offline too), like a new joke.
    save.mutateAsync({ id, input: { name: 'Untitled set', show_date: null, target_seconds: 420, venue_name: null, rating: null, tag_ids: [], items: [] } }).catch((e: Error) => toast(`Set not saved: ${e.message}`))
    navigate(`/sets/${id}`)
  }
  const onDelete = async (s: Setlist) => {
    if (await confirm({ title: `Delete ${s.name}?`, message: 'The jokes stay in your library.', confirmLabel: 'Delete set', danger: true })) {
      remove.mutateAsync(s.id).catch((e: Error) => toast(`Set not deleted: ${e.message}`))
      toast('Set deleted')
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Sets"><Button variant="tape" icon={<Plus size={18} />} onClick={create}>New set</Button></PageHead>
      {isPending && !sets.length ? (
        <Spinner />
      ) : sorted.length === 0 ? (
        <EmptyState title="No sets yet">Got a spot coming up? Make a set, drop your jokes in, and see if it fits the slot.</EmptyState>
      ) : (
        <>
        {used.length > 0 && (
          <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1" role="group" aria-label="Show sets tagged">
            <button type="button" aria-pressed={!showing} onClick={() => setTag(null)} className={tagChip(!showing)}>All</button>
            {used.map((t) => <button key={t.id} type="button" aria-pressed={showing === t.id} onClick={() => setTag(t.id)} className={tagChip(showing === t.id)}>{t.name}</button>)}
          </div>
        )}
        <ul className="space-y-3">
          {sorted.map((s) => (
            <li key={s.id} className="rounded-xl bg-ink-2 p-4 ring-1 ring-rule">
              <div className="flex items-start gap-2">
                <Link to={`/sets/${s.id}`} className="min-w-0 flex-1">
                  <p className="headline truncate text-[26px]">{s.name}</p>
                  <p className="mt-1 text-sm text-dim">
                    {s.items.length} {s.items.length === 1 ? 'joke' : 'jokes'}, {clock(s.target_seconds)} slot
                  </p>
                  {(s.rating || s.tag_ids?.length > 0) && (
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-dim">
                      {s.rating && <Stars rating={s.rating} />}
                      {s.tag_ids?.map((id) => tagName.get(id)).filter(Boolean).map((name) => <span key={name} className="rounded-full bg-ink-3 px-2 py-0.5 text-[13px]">{name}</span>)}
                    </p>
                  )}
                </Link>
                <Link to={`/sets/${s.id}/stage`} aria-label={`Rehearse ${s.name}`} className="inline-flex size-10 items-center justify-center rounded-lg bg-ink-3 text-paper hover:bg-ink-4"><Play size={17} /></Link>
                <Dropdown items={[
                  { label: 'Print', icon: <Printer size={16} />, onSelect: () => navigate(`/sets/${s.id}/print`) },
                  { label: 'Delete set', icon: <Trash2 size={16} />, danger: true, onSelect: () => onDelete(s) },
                ]} trigger={<IconButton label="More"><MoreHorizontal size={18} /></IconButton>} />
              </div>
              <div className="mt-4"><LightBar total={totalSeconds(draftItems(s.items))} optional={optionalSeconds(draftItems(s.items))} target={s.target_seconds} /></div>
            </li>
          ))}
        </ul>
        {sorted.length === 0 && <p className="text-dim">No sets with that tag.</p>}
        </>
      )}
    </div>
  )
}
