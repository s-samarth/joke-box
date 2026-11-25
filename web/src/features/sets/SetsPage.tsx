/**
 * Your sets as cards (docs/screens-perform.md): each shows its point, its spine, its checks and
 * its length. Chips filter by status (Draft, Work in Progress, Stage Ready, Discarded); All
 * leaves Discarded out, as premises do. The four steps of a set sit on top until you hide them.
 * "New set" creates one and opens it straight away; so does /sets?new=1 (the + button).
 */
import { CircleHelp, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { newId } from '../../api/client'
import { useSetFields } from '../../api/setFields'
import { useSetTags } from '../../api/setTags'
import { useSetlistActions, useSetlists } from '../../api/shows'
import type { Setlist } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { EmptyState, PageHead, Spinner } from '../../components/ui/pieces'
import { useFeedback } from '../../components/ui/feedbackContext'
import { emptySet } from './beatEdit'
import { tagChip } from './chips'
import { SET_FILTERS, shows, type SetFilter } from './setCard'
import { SetCard } from './SetCard'
import { SetGuide } from './SetGuide'
import { SetsGuideStrip } from './SetsGuideStrip'

const HIDDEN = 'jokebox.setsGuideHidden'
const guideHidden = () => { try { return localStorage.getItem(HIDDEN) === '1' } catch { return false } }

export function SetsPage() {
  const { data: sets = [], isPending } = useSetlists()
  const { data: tags = [] } = useSetTags()
  const config = useSetFields()
  const [params, setParams] = useSearchParams()
  const filter: SetFilter = SET_FILTERS.find((f) => f === params.get('status')) ?? 'All'
  const [guide, setGuide] = useState(false)
  const [stripHidden, setStripHidden] = useState(guideHidden)
  const tagName = new Map(tags.map((t) => [t.id, t.name]))
  const { save, remove } = useSetlistActions()
  const { confirm, toast } = useFeedback()
  const navigate = useNavigate()
  const sorted = sets.filter((s) => shows(s, filter)).sort((a, b) => b.updated_at.localeCompare(a.updated_at))

  const pick = (f: SetFilter) => setParams((p) => { if (f === 'All') p.delete('status'); else p.set('status', f); return p }, { replace: true })
  const hideStrip = () => { setStripHidden(true); try { localStorage.setItem(HIDDEN, '1') } catch { /* hidden for now only */ } }
  const create = () => {
    const id = newId()
    // Shown at once and saved in the background (offline too), like a new joke.
    save.mutateAsync({ id, input: emptySet() }).catch((e: Error) => toast(`Set not saved: ${e.message}`))
    navigate(`/sets/${id}`)
  }
  // The + button's flag. The ref stops a second set when React runs the effect twice in development.
  const started = useRef(false)
  useEffect(() => {
    if (params.has('new') && !started.current) {
      started.current = true
      create()
    }
  })
  const onDelete = async (s: Setlist) => {
    if (await confirm({ title: `Delete ${s.name}?`, message: 'It goes to the Trash for 30 days. The jokes stay in your library.', confirmLabel: 'Delete set', danger: true })) {
      remove.mutateAsync(s.id).catch((e: Error) => toast(`Set not deleted: ${e.message}`))
      toast('Set deleted')
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <PageHead title="Sets">
        <span className="hidden sm:block"><Button variant="quiet" icon={<CircleHelp size={18} />} onClick={() => setGuide(true)} className="ring-1 ring-rule-strong">How sets work</Button></span>
        <span className="sm:hidden"><IconButton label="How sets work" onClick={() => setGuide(true)}><CircleHelp size={18} /></IconButton></span>
        <Button variant="tape" icon={<Plus size={18} />} onClick={create}>New set</Button>
      </PageHead>
      <SetGuide open={guide} onOpenChange={setGuide} />
      {!stripHidden && <SetsGuideStrip onOpen={() => setGuide(true)} onHide={hideStrip} />}
      {isPending && !sets.length ? (
        <Spinner />
      ) : sets.length === 0 ? (
        <EmptyState title="No sets yet">Got a spot coming up? Make a set: a point, then beats in order, each with its premises and jokes. “How sets work” explains every part.</EmptyState>
      ) : (
        <>
          <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1" role="group" aria-label="Show sets by status">
            {SET_FILTERS.map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => pick(f)} className={tagChip(filter === f)}>
                {f} <span className={filter === f ? 'text-ink/60' : 'text-faint'}>{sets.filter((s) => shows(s, f)).length}</span>
              </button>
            ))}
          </div>
          {sorted.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {sorted.map((s) => <SetCard key={s.id} set={s} config={config} tagName={tagName} onDelete={onDelete} />)}
            </div>
          ) : (
            <p className="py-10 text-center text-dim">No sets are {filter} yet.</p>
          )}
        </>
      )}
    </div>
  )
}
