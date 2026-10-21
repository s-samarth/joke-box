/**
 * The craft technique a brainstorm session runs: its prompts one at a time, with the full note
 * folded away. With no technique yet, a menu offers your techniques from Craft.
 */
import { ChevronDown, GraduationCap, Shuffle, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useCraftNotes } from '../../api/craft'
import { Button } from '../../components/ui/Button'
import { Dropdown } from '../../components/ui/Menu'
import { prompts } from '../craft/bodyFormat'
import { NoteBody } from '../craft/NoteBody'

interface Props {
  techniqueId: string | null
  onChange: (id: string | null) => void
}

export function TechniquePanel({ techniqueId, onChange }: Props) {
  const { data: notes = [] } = useCraftNotes()
  const [at, setAt] = useState(0)
  const techniques = notes.filter((n) => n.behaviour === 'technique')
  const note = notes.find((n) => n.id === techniqueId)

  if (!note) {
    if (!techniques.length) return null
    const items = techniques.map((t) => ({ label: t.title, onSelect: () => { setAt(0); onChange(t.id) } }))
    return (
      <Dropdown align="start" items={items} trigger={
        <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink-3 px-3 text-sm text-dim hover:text-paper">
          <GraduationCap size={15} /> Use a technique <ChevronDown size={14} />
        </button>
      } />
    )
  }

  const list = prompts(note.body)
  const prompt = list.length ? list[at % list.length] : null
  return (
    <section className="rounded-xl bg-ink-2 p-4 ring-1 ring-rule" aria-label="Technique">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-dim">
          <GraduationCap size={15} className="mr-1.5 inline align-[-2px] text-tape" />
          <Link to={`/craft/${note.id}`} className="font-medium text-paper hover:text-tape">{note.title}</Link>
        </p>
        <button type="button" aria-label="Stop using this technique" onClick={() => onChange(null)} className="-mt-1 -mr-1 inline-flex size-8 items-center justify-center rounded-md text-faint hover:bg-ink-3 hover:text-paper"><X size={16} /></button>
      </div>
      {prompt && (
        <div className="mt-3">
          <p className="headline text-2xl leading-tight sm:text-3xl" aria-live="polite">{prompt}</p>
          <div className="mt-3 flex items-center gap-2">
            <Button small variant="tape" onClick={() => setAt(at + 1)}>Next prompt</Button>
            <Button small variant="quiet" icon={<Shuffle size={15} />} onClick={() => setAt(Math.floor(Math.random() * list.length))}>Any prompt</Button>
            <span className="ml-auto text-sm text-faint tabular">{(at % list.length) + 1} of {list.length}</span>
          </div>
        </div>
      )}
      <details className="mt-3 text-sm" open={!prompt}>
        <summary className="cursor-pointer select-none text-dim hover:text-paper">How it works</summary>
        <div className="mt-3"><NoteBody body={note.body} /></div>
      </details>
    </section>
  )
}
