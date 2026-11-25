/**
 * One beat, open: its cue (the word you memorise), its own time (set by hand; joke times don't
 * count), what it's for, its labels, and its list of premises, jokes and crowd work.
 */
import { Lightbulb, MessagesSquare, Plus, Trash2 } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import type { Premise } from '../../api/premises'
import type { Beat, Joke, SetField } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { GrowingText, Input } from '../../components/ui/Field'
import { clock, parse } from '../../lib/duration'
import { BeatLabels } from './BeatLabels'
import { newCrowd, setEntries } from './beatEdit'
import { EntryList } from './EntryList'

interface Props {
  beat: Beat
  previous: Beat | null
  needsWhy: boolean
  fields: SetField[]
  onChange: (beat: Beat) => void
  onDelete: () => void
  jokes: Map<string, Joke>
  premises: Map<string, Premise>
  leadOf: (clusterId: string) => string | null | undefined
  onOpen: (joke: Joke) => void
  /** null: into a new list with no premise, at the end of the beat. */
  onAddJokes: (entryId: string | null) => void
  onAddPremise: () => void
  /** Put these jokes of a no-premise list under a premise. */
  onGroup: (entryId: string, pieceIds: string[]) => void
}

const section = 'text-[11.5px] font-semibold tracking-[0.13em] text-faint uppercase'

function BeatTime({ seconds, onChange }: { seconds: number; onChange: (s: number) => void }) {
  const [text, setText] = useState(clock(seconds))
  return (
    <div className="w-24 shrink-0">
      <Input inputMode="numeric" aria-label="Time for this beat" className="text-center tabular" value={text} onChange={(e) => setText(e.target.value)}
        onBlur={() => { const s = parse(text); if (s !== null) onChange(s); setText(clock(s ?? seconds)) }} />
    </div>
  )
}

export function BeatEditor({ beat, previous, needsWhy, fields, onChange, onDelete, onAddPremise, ...lists }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="tape min-w-0 flex-1 px-4 py-1.5" style={{ '--tilt': '-0.5deg' } as CSSProperties}>
          <input aria-label="Cue word" placeholder="Cue word" maxLength={80} value={beat.cue} onChange={(e) => onChange({ ...beat, cue: e.target.value })}
            className="w-full bg-transparent font-marker text-2xl text-tape-ink placeholder:text-tape-ink/50 outline-none" />
        </div>
        <button type="button" onClick={onDelete} aria-label="Delete this beat" title="Delete this beat" className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-faint hover:bg-ink-3 hover:text-light"><Trash2 size={17} /></button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm text-dim">Time for this beat</span>
        <BeatTime key={beat.id} seconds={beat.seconds} onChange={(seconds) => onChange({ ...beat, seconds })} />
        <span className="basis-full text-xs text-faint sm:basis-auto">You set this. Joke times don't count.</span>
      </div>
      <div>
        <p className={section}>What it's for</p>
        <GrowingText aria-label="Description" maxLength={4000} placeholder="What this beat does, and how you get into it" value={beat.description}
          className="mt-1.5 rounded-lg bg-ink-2 px-3 py-2.5 leading-relaxed ring-1 ring-rule-strong focus:ring-2 focus:ring-tape" onChange={(e) => onChange({ ...beat, description: e.target.value })} />
      </div>
      <div>
        <p className={`${section} mb-2`}>Labels for this beat, in this set</p>
        <BeatLabels beat={beat} previous={previous} fields={fields} needsWhy={needsWhy} onChange={onChange} />
      </div>
      <div>
        <p className={`${section} mb-2`}>The beat, in order</p>
        <EntryList beat={beat} onChange={onChange} {...lists} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button small icon={<Lightbulb size={15} />} onClick={onAddPremise}>Premise</Button>
          <Button small icon={<Plus size={15} />} onClick={() => lists.onAddJokes(null)}>Jokes, no premise</Button>
          <Button small icon={<MessagesSquare size={15} />} onClick={() => onChange(setEntries(beat, [...beat.entries, newCrowd()]))}>Crowd work</Button>
        </div>
      </div>
    </div>
  )
}
