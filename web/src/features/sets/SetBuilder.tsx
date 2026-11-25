/**
 * Building a set (docs/sets.md): its point, its beats in a fixed order (the spine), the shape of
 * its status, and the open beat with its premises, jokes and crowd work. Saves itself as you go.
 * Desktop shows the spine beside the open beat; phones and iPads in portrait stack them.
 */
import { ArrowLeft, CircleHelp, GraduationCap, Play, ScrollText, SlidersHorizontal } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useClusters } from '../../api/clusters'
import { useJokes } from '../../api/library'
import { usePremises } from '../../api/premises'
import { useLoadedSetFields, useSaveSetFields, useSetFields } from '../../api/setFields'
import { useSetlists } from '../../api/shows'
import type { Beat, Joke, Setlist } from '../../api/types'
import { EmptyState, Spinner } from '../../components/ui/pieces'
import { Field, GrowingText, Input } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { chainTo } from '../../lib/chains'
import { clock, parse } from '../../lib/duration'
import { CraftSheet } from '../craft/CraftSheet'
import { leadOf as leadOfCluster, versionsOf } from '../jokes/cluster/lead'
import { JokePeek } from '../jokes/JokePeek'
import { AddJokes } from './AddJokes'
import { BeatEditor } from './BeatEditor'
import { addPiecesTo, mapBeat, newBeat, newPremise, pieceFor, setEntries, swap } from './beatEdit'
import { beatTotal, jokeIds, needsWhy } from './beats'
import { FieldsSheet } from './FieldsSheet'
import { LightBar } from './LightBar'
import { PremisePicker } from './PremisePicker'
import { SetChecks } from './SetChecks'
import { SetGuide } from './SetGuide'
import { SetMeta } from './SetMeta'
import { Spine } from './Spine'
import { useAutosaveSet } from './useAutosaveSet'

const iconLink = 'inline-flex size-10 items-center justify-center rounded-lg text-dim hover:bg-ink-3 hover:text-paper'
const section = 'text-[11.5px] font-semibold tracking-[0.13em] text-faint uppercase'
type Sheet = 'guide' | 'fields' | 'craft' | null

function Builder({ setlist }: { setlist: Setlist }) {
  const { draft, update } = useAutosaveSet(setlist)
  const { data: jokes = [] } = useJokes()
  const { data: premiseList = [] } = usePremises()
  const { data: clusters = [] } = useClusters()
  const config = useSetFields()
  const loaded = useLoadedSetFields()
  const saveFields = useSaveSetFields()
  const { confirm, toast } = useFeedback()
  const [selected, setSelected] = useState<string | null>(draft.beats[0]?.id ?? null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [picking, setPicking] = useState<{ beatId: string; entryId: string | null } | null>(null)
  const [premiseFor, setPremiseFor] = useState<string | null>(null)
  const [reading, setReading] = useState<Joke | null>(null)
  const [target, setTarget] = useState(clock(draft.target_seconds))
  const editor = useRef<HTMLDivElement>(null)
  // Stacked (phone, iPad in portrait), the open beat is below the spine: go to it.
  const open = (id: string) => {
    setSelected(id)
    if (window.matchMedia('(max-width: 1023px)').matches) requestAnimationFrame(() => editor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  const byId = new Map(jokes.map((j) => [j.id, j]))
  const premises = new Map(premiseList.map((p) => [p.id, p]))
  // The lead as the server keeps it, worked out here too (a discarded lead hands on), as on stage
  const leadOf = (id: string) => leadOfCluster(clusters.find((c) => c.id === id), versionsOf(id, jokes))?.id
  const beats = draft.beats
  const index = beats.findIndex((b) => b.id === selected)
  const beat = index >= 0 ? beats[index] : null
  const used = jokeIds(beats)
  const setBeats = (change: (b: Beat[]) => Beat[]) => update((d) => ({ ...d, beats: change(d.beats) }))
  const changeBeat = (next: Beat) => setBeats((list) => mapBeat(list, next.id, () => next))

  // A joke that follows others brings the ones before it that aren't in the set yet.
  const add = (joke: Joke) => {
    if (!picking || used.has(joke.id)) return
    const pieces = chainTo(joke, byId).filter((j) => !used.has(j.id)).map((j) => pieceFor(j, leadOf))
    const found = beats.find((b) => b.id === picking.beatId)
    if (!found) return
    const out = addPiecesTo(found, picking.entryId, pieces)
    changeBeat(out.beat)
    setPicking({ ...picking, entryId: out.entryId })
    if (pieces.length > 1) toast(`Also added the ${pieces.length === 2 ? 'joke' : `${pieces.length - 1} jokes`} before it`)
  }
  const addBeat = () => { const b = newBeat(); setBeats((list) => [...list, b]); open(b.id) }
  const deleteBeat = async (b: Beat) => {
    if (b.entries.length && !(await confirm({ title: `Delete ${b.cue || 'this beat'}?`, message: 'Its premises, jokes and crowd work come out of the set. The jokes stay in your library.', confirmLabel: 'Delete beat', danger: true }))) return
    setBeats((list) => list.filter((x) => x.id !== b.id))
    setSelected(beats.find((x) => x.id !== b.id)?.id ?? null)
  }
  const pickPremise = (premiseId: string) => {
    const found = beats.find((b) => b.id === premiseFor)
    if (!found) return
    const entry = newPremise(premiseId)
    changeBeat(setEntries(found, [...found.entries, entry]))
    setPremiseFor(null)
    setPicking({ beatId: found.id, entryId: entry.id })
  }

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <div className="flex h-12 items-center justify-between gap-2 lg:mt-6">
        <Link to="/sets" aria-label="Sets" className="inline-flex min-w-0 items-center gap-1.5 text-dim hover:text-paper"><ArrowLeft size={18} /><span className="max-[359px]:hidden">Sets</span></Link>
        <div className="flex gap-0.5">
          <button type="button" onClick={() => setSheet('guide')} aria-label="How sets work" title="How sets work" className={iconLink}><CircleHelp size={18} /></button>
          <button type="button" onClick={() => setSheet('fields')} aria-label="Label fields" title="Label fields" className={iconLink}><SlidersHorizontal size={18} /></button>
          <button type="button" onClick={() => setSheet('craft')} aria-label="Notes on building a set" title="Notes on building a set" className={iconLink}><GraduationCap size={18} /></button>
          <Link to={`/sets/${setlist.id}/print`} aria-label="Cue card" title="Cue card" className={iconLink}><ScrollText size={18} /></Link>
          <Link to={`/sets/${setlist.id}/stage`} aria-label="On stage" className="ml-1 inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-tape px-3 font-semibold text-tape-ink"><Play size={16} /><span className="max-[359px]:hidden">On stage</span></Link>
        </div>
      </div>
      <div className="max-w-3xl">
        <GrowingText aria-label="Set name" maxLength={200} className="headline mt-4 text-[44px] sm:text-[56px]" value={draft.name} placeholder="Untitled set" onChange={(e) => update((d) => ({ ...d, name: e.target.value }))} />
        <div className="mt-5">
          <p className={section}>The point</p>
          <GrowingText aria-label="The point" maxLength={1000} placeholder="Your one point tonight, in one sentence" value={draft.point}
            className="mt-1.5 rounded-lg bg-ink-2 px-3 py-2.5 text-lg leading-snug ring-1 ring-rule-strong focus:ring-2 focus:ring-tape" onChange={(e) => update((d) => ({ ...d, point: e.target.value }))} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Field label="Slot length">
            <Input inputMode="numeric" className="tabular" value={target} onChange={(e) => setTarget(e.target.value)}
              onBlur={() => { const s = parse(target); if (s) update((d) => ({ ...d, target_seconds: s })); setTarget(clock(s || draft.target_seconds)) }} />
          </Field>
        </div>
        <SetMeta draft={draft} update={update} />
        <div className="mt-8"><LightBar total={beatTotal(beats)} target={draft.target_seconds} big /></div>
      </div>
      {beats.length > 0 && (
        <section className="mt-8 rounded-2xl bg-ink-2/50 p-4 ring-1 ring-rule">
          <p className={`${section} mb-3`}>{config.fields.find((f) => f.role === 'status')?.name ?? 'Status'} across the set, by beat time</p>
          <SetChecks beats={beats} config={config} onLimit={(s) => loaded && saveFields.mutate({ ...loaded, top_up_seconds: s })} />
        </section>
      )}
      <div className="mt-8 grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div>
          <p className={`${section} mb-2`}>Spine · beats run in this order</p>
          <Spine beats={beats} fields={config.fields} selected={selected} onSelect={open} onAdd={addBeat} onMove={(i, d) => setBeats((list) => swap(list, i, d))} />
        </div>
        <div ref={editor} className="min-w-0 scroll-mt-16 rounded-2xl p-4 ring-1 ring-rule">
          {beat ? (
            <BeatEditor key={beat.id} beat={beat} previous={beats[index - 1] ?? null} needsWhy={needsWhy(beats, index, config.fields)} fields={config.fields}
              onChange={changeBeat} onDelete={() => deleteBeat(beat)} jokes={byId} premises={premises} leadOf={leadOf} onOpen={setReading}
              onAddJokes={(entryId) => setPicking({ beatId: beat.id, entryId })} onAddPremise={() => setPremiseFor(beat.id)} />
          ) : (
            <p className="py-10 text-center text-dim">{beats.length ? 'Pick a beat to open it.' : 'No beats yet. Add the first one: a cue word for what you talk about first.'}</p>
          )}
        </div>
      </div>
      <Modal open={Boolean(picking)} onOpenChange={(o) => !o && setPicking(null)} title="Add jokes" description={`Into ${beats.find((b) => b.id === picking?.beatId)?.cue || 'this beat'}. Tap + to add, tap a joke to read it.`}>
        <div className="h-[62dvh]"><AddJokes used={used} onAdd={add} onOpen={setReading} /></div>
      </Modal>
      <PremisePicker open={Boolean(premiseFor)} onOpenChange={(o) => !o && setPremiseFor(null)} onPick={pickPremise}
        used={new Set(beats.find((b) => b.id === premiseFor)?.entries.flatMap((e) => (e.kind === 'premise' && e.premise_id ? [e.premise_id] : [])) ?? [])} />
      <SetGuide open={sheet === 'guide'} onOpenChange={(o) => setSheet(o ? 'guide' : null)} />
      <FieldsSheet open={sheet === 'fields'} onOpenChange={(o) => setSheet(o ? 'fields' : null)} />
      <CraftSheet open={sheet === 'craft'} onOpenChange={(o) => setSheet(o ? 'craft' : null)} title="Building a set" screen="sets" empty="No notes in the areas that show on the set builder." />
      {reading && <JokePeek joke={reading} onClose={() => setReading(null)} onAdd={picking ? () => add(reading) : undefined} inSet={used.has(reading.id)} />}
    </div>
  )
}

export function SetBuilder() {
  const { setId } = useParams()
  const { data: sets, isPending } = useSetlists()
  const setlist = sets?.find((s) => s.id === setId)
  if (isPending && !sets) return <div className="py-16"><Spinner /></div>
  if (!setlist) return <EmptyState title="Set not found" action={<Link to="/sets" className="text-tape">Back to sets</Link>}>It may have been deleted.</EmptyState>
  return <Builder key={setlist.id} setlist={setlist} />
}
