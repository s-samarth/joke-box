/**
 * "From voice notes": the recordings a joke came from, each playable where you write, with × to
 * unlink. Shows nothing when there are none (or all were deleted). A recording still waiting to
 * upload plays from this phone. The links live on the joke, so changes save with it.
 */
import { X } from 'lucide-react'
import { IconButton } from '../../components/ui/Button'
import { useFeedback } from '../../components/ui/feedbackContext'
import { clock } from '../../lib/duration'
import { PlayButton } from './PlayButton'
import { usePlayer } from './usePlayer'
import { useVoiceLibrary, type NoteView } from './useVoiceLibrary'

function Row({ note, onUnlink }: { note: NoteView; onUnlink?: () => void }) {
  const player = usePlayer(note.id, note.duration_seconds)
  return (
    <li className="flex items-center gap-3 py-2">
      <PlayButton player={player} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] ${note.label ? '' : 'text-dim'}`}>{note.label || 'Untitled note'}</p>
        <p className="text-xs text-faint tabular">{clock(note.duration_seconds)}{note.local ? ' · on this phone, not uploaded yet' : ''}</p>
      </div>
      {onUnlink && <IconButton label="Unlink this voice note" onClick={onUnlink}><X size={16} /></IconButton>}
    </li>
  )
}

/** `onChange` absent: read-only (Rewrite, the joke panel). */
export function VoiceNotesOn({ ids, onChange }: { ids: string[]; onChange?: (ids: string[]) => void }) {
  const { notes } = useVoiceLibrary()
  const { toast } = useFeedback()
  const shown = ids.flatMap((id) => notes.filter((n) => n.id === id))
  if (shown.length === 0) return null
  const unlink = (id: string) => {
    if (!onChange) return
    onChange(ids.filter((i) => i !== id))
    toast('Voice note unlinked', { label: 'Undo', onClick: () => onChange(ids) })
  }

  return (
    <section aria-label="From voice notes">
      <h3 className="mb-1 text-sm text-dim">From voice notes</h3>
      <ul className="divide-y divide-rule border-y border-rule">
        {shown.map((n) => <Row key={n.id} note={n} onUnlink={onChange ? () => unlink(n.id) : undefined} />)}
      </ul>
    </section>
  )
}
