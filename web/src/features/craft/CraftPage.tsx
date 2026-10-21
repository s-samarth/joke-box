/**
 * Craft: everything you know about doing stand-up. Top to bottom: your path as a staircase,
 * techniques you can start writing with, then your areas as folders. Searching swaps the
 * folders for matching note cards from every area.
 */
import { ArrowUpDown, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useCraftAreas, useCraftNotes } from '../../api/craft'
import type { CraftArea } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { PageHead, SectionHead, Spinner } from '../../components/ui/bits'
import { Input } from '../../components/ui/Field'
import { AreaFolders } from './AreaFolders'
import { AreaSheet } from './AreaSheet'
import { ArrangeAreas } from './ArrangeAreas'
import { groupByArea, matches } from './craftMeta'
import { NoteGrid } from './NoteGrid'
import { PathLadder } from './PathLadder'
import { TechniqueShelf } from './TechniqueShelf'

type Sheet = { kind: 'new' } | { kind: 'edit'; area: CraftArea } | { kind: 'arrange' } | null

export function CraftPage() {
  const { data: notes = [], isPending } = useCraftNotes()
  const { data: areas = [], isPending: areasPending } = useCraftAreas()
  const [query, setQuery] = useState('')
  const [sheet, setSheet] = useState<Sheet>(null)
  const groups = groupByArea(notes, areas)
  const counts = new Map(groups.map((g) => [g.area.id, g.notes.length]))
  const found = query.trim() ? notes.filter((n) => matches(n, query)) : null

  if (isPending || areasPending) return <div className="py-16"><Spinner /></div>

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <PageHead title="Craft">
        <Link to="/craft/new" className="inline-flex h-9 items-center gap-2 rounded-lg bg-tape px-3 text-sm font-semibold text-tape-ink hover:bg-[#f5da77]"><Plus size={16} /> New note</Link>
      </PageHead>
      <p className="-mt-2 mb-5 text-dim">What you know about doing stand-up. {notes.length} notes in {areas.length} areas.</p>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
        <Input type="search" aria-label="Search craft notes" placeholder="Search every note" className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {found ? (
        <section className="mt-6">
          <p className="mb-3 text-sm text-dim">{found.length === 1 ? '1 note' : `${found.length} notes`} match “{query.trim()}”</p>
          <NoteGrid notes={found} areas={areas} showArea />
        </section>
      ) : (
        <>
          <div className="mt-6"><PathLadder /></div>
          <TechniqueShelf notes={notes} areas={areas} />
          <section className="mt-10">
            <SectionHead title="Areas">
              <Button variant="quiet" small icon={<ArrowUpDown size={15} />} onClick={() => setSheet({ kind: 'arrange' })}>Arrange</Button>
            </SectionHead>
            <AreaFolders groups={groups} onAdd={() => setSheet({ kind: 'new' })} />
          </section>
        </>
      )}

      {sheet?.kind === 'arrange' && <ArrangeAreas areas={areas} counts={counts} onClose={() => setSheet(null)} onEdit={(area) => setSheet({ kind: 'edit', area })} />}
      {(sheet?.kind === 'new' || sheet?.kind === 'edit') && (
        <AreaSheet area={sheet.kind === 'edit' ? sheet.area : undefined} areas={areas} noteCount={sheet.kind === 'edit' ? counts.get(sheet.area.id) ?? 0 : 0} onClose={() => setSheet(null)} />
      )}
    </div>
  )
}
