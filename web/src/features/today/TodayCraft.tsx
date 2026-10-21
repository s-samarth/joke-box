/** Craft, from Home: where you are on your path, and a box for something you just learned. */
import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { newId } from '../../api/client'
import { useCraftAreas, useCraftKinds, useCraftNotes, useSaveCraftNote } from '../../api/craft'
import { SectionHead } from '../../components/ui/bits'
import { useFeedback } from '../../components/ui/feedbackContext'
import { areaColor, kindFor, lessonFrom } from '../craft/craftMeta'
import { PathLadder } from '../craft/PathLadder'
import { announceSave } from '../../lib/announce'

const chip = (on: boolean) => `inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm transition ${on ? 'bg-paper text-ink font-medium' : 'bg-ink-3 text-dim hover:text-paper'}`

function LessonBox() {
  const [text, setText] = useState('')
  const { data: notes = [] } = useCraftNotes()
  const { data: areas = [] } = useCraftAreas()
  const { data: kinds = [] } = useCraftKinds()
  const [picked, setPicked] = useState<string | null>(null)
  const area = areas.find((a) => a.id === picked)?.id ?? areas[0]?.id ?? ''
  const save = useSaveCraftNote()
  const { toast } = useFeedback()
  const submit = () => {
    if (!text.trim() || !area) return
    const saving = save.mutateAsync({ id: newId(), input: { ...lessonFrom(text, notes, { area_id: area, kind_id: kindFor(kinds) }), created_at: new Date().toISOString() } })
    saving.catch((e: Error) => toast(`Not saved: ${e.message}`))
    setText('')
    announceSave(saving, toast, 'Lesson saved to Craft')
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }} className="rounded-xl bg-ink-2 ring-1 ring-rule transition focus-within:ring-2 focus-within:ring-paper/40">
      <label htmlFor="lesson-text" className="sr-only">Lesson</label>
      <textarea id="lesson-text" rows={2} value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
        placeholder="Learned something about doing stand-up?"
        className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-lg leading-snug text-paper outline-none placeholder:text-faint" />
      <div className="flex items-center gap-2 px-3 pb-3">
        <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto" role="group" aria-label="Area">
          {areas.map((a) => (
            <button key={a.id} type="button" aria-pressed={area === a.id} onClick={() => setPicked(a.id)} className={chip(area === a.id)} style={{ '--area': areaColor(a.color) } as CSSProperties}>
              <span className="size-2 rounded-full bg-[var(--area)]" aria-hidden />{a.name}
            </button>
          ))}
        </div>
        <button type="submit" disabled={!text.trim()} className="h-9 shrink-0 rounded-lg bg-paper px-3 text-[15px] font-medium text-ink transition disabled:bg-ink-4 disabled:text-faint">Save lesson</button>
      </div>
    </form>
  )
}

export function TodayCraft() {
  const { data: notes = [] } = useCraftNotes()
  return (
    <section className="mt-12">
      <SectionHead title="Craft">
        <Link to="/craft" className="text-sm text-dim hover:text-paper">{notes.length ? `All ${notes.length}` : 'Open'}</Link>
      </SectionHead>
      <div className="space-y-3">
        <PathLadder compact />
        <LessonBox />
      </div>
    </section>
  )
}
