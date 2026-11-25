/**
 * Bird's eye view (docs/sets.md): the whole set from above, to read and plan. The time strip runs
 * across the top, to scale against the slot, and the beat board sits under it: one column per beat
 * with its labels, blocks, gates and every joke in full. Both scroll together, both ways, and zoom
 * (useZoom.ts). Tap a joke on the strip to find it on the board. Colours come from your Label
 * fields and each joke's Vibe, as in the builder.
 */
import { GraduationCap, Minus, Plus, ScrollText, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useJokes } from '../../api/library'
import { usePremises } from '../../api/premises'
import { useSetFields } from '../../api/setFields'
import { useSetlists } from '../../api/shows'
import { IconButton } from '../../components/ui/Button'
import { clock } from '../../lib/duration'
import { CraftSheet } from '../craft/CraftSheet'
import { personaLabel, usePersonaField } from '../jokes/persona'
import { useVibeTone } from '../jokes/vibeTone'
import { BeatBoard } from './BeatBoard'
import { beatTotal, beatsOf } from './beats'
import { boardWidth, numbers, scaleFor, starts, stripLayout } from './birdsEye'
import { TimeStrip } from './TimeStrip'
import { useZoom } from './useZoom'

const icon = 'inline-flex size-10 items-center justify-center rounded-lg text-faint hover:bg-ink-3 hover:text-paper'

export function BirdsEyeView() {
  const { setId } = useParams()
  const { data: sets = [] } = useSetlists()
  const { data: jokes = [] } = useJokes()
  const { data: premiseList = [] } = usePremises()
  const { fields } = useSetFields()
  const persona = usePersonaField()
  const vibe = useVibeTone()
  const { zoom, set: setZoom, fit, frameRef, contentRef } = useZoom()
  const [notes, setNotes] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const setlist = sets.find((s) => s.id === setId)
  const beats = useMemo(() => (setlist ? beatsOf(setlist) : []), [setlist])
  const number = useMemo(() => numbers(beats), [beats])

  if (!setlist) return <div className="p-8 text-dim">Set not found. <Link to="/sets" className="text-tape">Back to sets</Link></div>
  const total = beatTotal(beats)
  const slot = setlist.target_seconds || total
  const px = scaleFor(boardWidth(beats.length), Math.max(slot, total))
  const strip = stripLayout(beats, slot, px, number)
  const data = {
    jokes: new Map(jokes.map((j) => [j.id, j])),
    premises: new Map(premiseList.map((p) => [p.id, p])),
    number, vibe, flash,
    vibeName: (id: string | null | undefined) => personaLabel(id, persona) ?? 'Not sure',
  }
  const find = (pieceId: string) => {
    document.getElementById(`be-${pieceId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    setFlash(pieceId)
    window.setTimeout(() => setFlash((f) => (f === pieceId ? null : f)), 1600)
  }

  return (
    <div className="pt-safe pb-safe fixed inset-0 flex flex-col bg-[#11141c]">
      <header className="flex flex-wrap items-center gap-x-1 gap-y-0.5 border-b border-rule bg-ink px-2 py-1.5">
        <Link to={`/sets/${setlist.id}`} aria-label="Back to the set" title="Back to the set" className={icon}><X size={22} /></Link>
        <div className="min-w-[11rem] flex-1">
          <h1 className="headline truncate text-2xl leading-tight">{setlist.name}</h1>
          <p className="text-[12px] text-faint">Bird's eye view · <span className="tabular">{clock(total)} of {clock(slot)}</span> · {beats.length} {beats.length === 1 ? 'beat' : 'beats'}</p>
        </div>
        <div className="ml-auto flex items-center" role="group" aria-label="Zoom">
          <IconButton label="Zoom out" onClick={() => setZoom(zoom / 1.2)}><Minus size={18} /></IconButton>
          <button type="button" onClick={() => setZoom(1)} title="Back to 100%" className="h-10 min-w-12 rounded-lg px-1 text-[13px] text-dim tabular hover:bg-ink-3">{Math.round(zoom * 100)}%</button>
          <IconButton label="Zoom in" onClick={() => setZoom(zoom * 1.2)}><Plus size={18} /></IconButton>
          <button type="button" onClick={fit} className="h-10 rounded-lg px-2 text-[13px] text-dim hover:bg-ink-3 hover:text-paper">Fit</button>
        </div>
        <Link to={`/sets/${setlist.id}/print`} aria-label="Cue card" title="Cue card" className={icon}><ScrollText size={19} /></Link>
        <button type="button" onClick={() => setNotes(true)} aria-label="Before you go on" title="Before you go on" className={icon}><GraduationCap size={20} /></button>
      </header>
      <div ref={frameRef} className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <div ref={contentRef} className="w-max p-3 sm:p-4" style={{ zoom }}>
          {beats.length === 0 ? <p className="p-6 text-lg text-dim">This set has no beats yet. Add one in the builder.</p> : <>
            <TimeStrip strip={strip} pxPerSecond={px} slot={slot} total={total} fields={fields} data={data} onPick={find} />
            <BeatBoard beats={beats} starts={starts(beats)} fields={fields} data={data} />
          </>}
        </div>
      </div>
      <CraftSheet open={notes} onOpenChange={setNotes} title="Before you go on" screen="stage" empty="No notes in the areas that show on Stage." />
    </div>
  )
}
