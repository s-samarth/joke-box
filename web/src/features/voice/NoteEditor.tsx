/** A note's label and hashtags. The label saves when you leave the field or press Enter. */
import { useState } from 'react'
import { HashtagField } from '../jokes/DetailControls'
import type { NoteView } from './useVoiceLibrary'

interface Props {
  note: NoteView
  suggestions: string[]
  onChange: (patch: { label?: string; hashtags?: string[] }) => void
  autoFocus?: boolean
}

export function NoteEditor({ note, suggestions, onChange, autoFocus }: Props) {
  const [label, setLabel] = useState(note.label)
  const commit = () => { if (label.trim() !== note.label) onChange({ label: label.trim() }) }
  return (
    <div className="space-y-2">
      <input autoFocus={autoFocus} value={label} maxLength={200} aria-label="Label" placeholder="Add a label (what's this about?)"
        onChange={(e) => setLabel(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
        className="h-11 w-full rounded-lg bg-ink-3 px-3 text-[16px] text-paper outline-none placeholder:text-faint focus:ring-2 focus:ring-tape sm:h-10 sm:text-[15px]" />
      <HashtagField value={note.hashtags} suggestions={suggestions} onChange={(hashtags) => onChange({ hashtags })} />
    </div>
  )
}
