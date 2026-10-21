/** Craft: what you've learned about doing stand-up, grouped by where in the work you use it. */
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useCraftNotes } from '../../api/craft'
import type { CraftKind } from '../../api/types'
import { EmptyState, PageHead, SectionHead, Spinner } from '../../components/ui/bits'
import { Input } from '../../components/ui/Field'
import { KINDS, groupByArea, kindLabel, matches } from './craftMeta'

const chip = (on: boolean) => `h-8 shrink-0 rounded-lg px-3 text-sm transition ${on ? 'bg-paper font-medium text-ink' : 'bg-ink-3 text-dim hover:text-paper'}`

const newButton = (
  <Link to="/craft/new" className="inline-flex h-9 items-center gap-2 rounded-lg bg-tape px-3 text-sm font-semibold text-tape-ink hover:bg-[#f5da77]">
    <Plus size={16} /> New note
  </Link>
)

/** The first line of the body without its formatting marks, as a preview. */
const preview = (body: string) =>
  body.split('\n').map((l) => l.replace(/^\s*(#+\s+|[-*]\s+|\d+[.)]\s+)?(\[[ xX]\]\s+)?/, '').replaceAll('**', '').trim()).find(Boolean) ?? ''

export function CraftPage() {
  const { data: notes = [], isPending } = useCraftNotes()
  const [kind, setKind] = useState<CraftKind | null>(null)
  const [query, setQuery] = useState('')
  const shown = notes.filter((n) => (!kind || n.kind === kind) && matches(n, query))
  const groups = groupByArea(shown)

  if (isPending) return <div className="py-16"><Spinner /></div>

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Craft">{notes.length > 0 && newButton}</PageHead>
      {notes.length === 0 ? (
        <EmptyState title="No craft notes yet" action={newButton}>
          Keep what you learn about doing stand-up here: checklists to tick through, writing techniques, things to look up, and where you want to get to. Your jokes stay in Jokes.
        </EmptyState>
      ) : (
        <>
          <div className="space-y-3">
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
              <Input type="search" aria-label="Search craft notes" placeholder="Search notes" className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0" role="group" aria-label="Show">
              <button type="button" className={chip(!kind)} aria-pressed={!kind} onClick={() => setKind(null)}>All</button>
              {KINDS.map((k) => (
                <button key={k.key} type="button" className={chip(kind === k.key)} aria-pressed={kind === k.key} title={k.hint} onClick={() => setKind(kind === k.key ? null : k.key)}>{k.label}s</button>
              ))}
            </div>
          </div>
          {groups.length === 0 && <p className="mt-6 text-dim">No notes match.</p>}
          {groups.map(({ area, notes: inArea }) => (
            <section key={area.key} className="mt-10">
              <SectionHead title={area.label}><span className="text-sm text-faint">{area.hint}</span></SectionHead>
              <ul className="divide-y divide-rule border-y border-rule">
                {inArea.map((n) => (
                  <li key={n.id}>
                    <Link to={`/craft/${n.id}`} className="block py-3 hover:bg-ink-2/60">
                      <p className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{n.title}</span>
                        <span className="shrink-0 text-[13px] text-faint">{kindLabel(n.kind)}</span>
                      </p>
                      {preview(n.body) && <p className="mt-0.5 line-clamp-1 text-sm text-dim">{preview(n.body)}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
