/**
 * Shown the instant you stop recording: name the note and tag it while it saves in the
 * background. "Done" (or Enter) files it; "Delete" throws it away.
 */
import { Check, LoaderCircle, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '../../components/ui/Button'
import { clock } from '../../lib/duration'
import { HashtagField } from '../jokes/DetailControls'
import { PlayButton } from './PlayButton'
import { usePlayer } from './usePlayer'

export interface Draft {
  label: string
  hashtags: string[]
}

interface Props {
  id: string
  seconds: number
  status: 'saving' | 'saved'
  draft: Draft
  suggestions: string[]
  onChange: (draft: Draft) => void
  onDone: () => void
  onDelete: () => void
}

export function NewNoteCard({ id, seconds, status, draft, suggestions, onChange, onDone, onDelete }: Props) {
  const label = useRef<HTMLInputElement>(null)
  // The recording is on this device before the card says "Saved", so it plays straight away.
  const player = usePlayer(id, seconds)
  // Jump straight into the label on a laptop. On a phone, wait for a tap, so the keyboard
  // doesn't cover the screen when all you wanted was to save.
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) label.current?.focus()
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">New voice note</p>
        <span className="inline-flex items-center gap-1.5 text-sm text-dim" aria-live="polite">
          {status === 'saving' ? <><LoaderCircle size={14} className="animate-spin" /> Saving…</> : <><Check size={15} className="text-ok" /> Saved</>}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <PlayButton player={player} waiting={status === 'saving'} />
        <input type="range" aria-label="Position" min={0} max={Math.max(1, player.duration)} step={0.1} value={player.position}
          disabled={player.state === 'idle'} onChange={(e) => player.seek(Number(e.target.value))} className="min-w-0 flex-1 accent-tape disabled:opacity-40" />
        <span className="shrink-0 text-sm text-faint tabular">{clock(Math.floor(player.position))} / {clock(Math.round(player.duration))}</span>
      </div>
      {player.problem && <p role="alert" className="text-sm text-light">{player.problem}</p>}
      <input ref={label} value={draft.label} maxLength={200} aria-label="Title" placeholder="Title (what's this about?)"
        onChange={(e) => onChange({ ...draft, label: e.target.value })}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onDone() } }}
        className="h-11 w-full rounded-lg bg-ink-3 px-3 text-[16px] text-paper outline-none placeholder:text-faint focus:ring-2 focus:ring-tape sm:h-10 sm:text-[15px]" />
      <HashtagField value={draft.hashtags} suggestions={suggestions} onChange={(hashtags) => onChange({ ...draft, hashtags })} />
      <div className="flex items-center justify-between pt-1">
        <Button variant="danger" small icon={<Trash2 size={15} />} onClick={onDelete}>Delete</Button>
        <Button variant="tape" onClick={onDone}>Done</Button>
      </div>
    </div>
  )
}
