/** One voice note: play it, see its label and hashtags, edit them, or delete it. */
import { CloudOff, LoaderCircle, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from '../../components/ui/Button'
import { useFeedback } from '../../components/ui/feedbackContext'
import { clock } from '../../lib/duration'
import { formatDateTime } from '../../lib/time'
import { NoteEditor } from './NoteEditor'
import { usePlayer } from './usePlayer'
import type { NoteView } from './useVoiceLibrary'

const STATUS: Record<NoteView['state'], string | null> = {
  saved: null,
  uploading: 'Uploading…',
  waiting: 'Waiting to upload',
  failed: 'Upload failed',
}

interface Props {
  note: NoteView
  suggestions: string[]
  onEdit: (patch: { label?: string; hashtags?: string[] }) => void
  onDelete: () => void
  onTag: (tag: string) => void
}

export function VoiceNoteRow({ note, suggestions, onEdit, onDelete, onTag }: Props) {
  const player = usePlayer(note.id, note.duration_seconds)
  const [editing, setEditing] = useState(false)
  const { confirm } = useFeedback()
  const status = note.problem ?? STATUS[note.state]
  const remove = async () => {
    if (await confirm({ title: 'Delete this voice note?', message: 'The recording is deleted for good.', confirmLabel: 'Delete', danger: true })) onDelete()
  }

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={player.toggle} aria-label={player.state === 'playing' ? 'Pause' : 'Play'}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink-3 text-paper hover:bg-ink-4">
          {player.state === 'loading' ? <LoaderCircle size={18} className="animate-spin" /> : player.state === 'playing' ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`truncate ${note.label ? 'font-medium' : 'text-dim'}`}>{note.label || 'Untitled note'}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-faint">
            <span className="tabular">{player.state === 'idle' ? clock(note.duration_seconds) : `${clock(Math.floor(player.position))} / ${clock(Math.round(player.duration))}`}</span>
            <span>{formatDateTime(note.created_at)}</span>
            {status && <span className={`inline-flex items-center gap-1 ${note.state === 'failed' ? 'text-light' : 'text-amber'}`}><CloudOff size={13} />{status}</span>}
          </p>
        </div>
        <IconButton label="Edit label and hashtags" onClick={() => setEditing((e) => !e)}><Pencil size={16} /></IconButton>
        <IconButton label="Delete voice note" onClick={remove} className="hover:text-light"><Trash2 size={16} /></IconButton>
      </div>
      {player.state !== 'idle' && (
        <input type="range" aria-label="Position" min={0} max={Math.max(1, player.duration)} step={0.1} value={player.position}
          onChange={(e) => player.seek(Number(e.target.value))} className="mt-2 w-full accent-tape" />
      )}
      {player.problem && <p role="alert" className="mt-1 text-sm text-light">{player.problem}</p>}
      {editing ? (
        <div className="mt-3 pl-14"><NoteEditor note={note} suggestions={suggestions} onChange={onEdit} /></div>
      ) : note.hashtags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5 pl-14">
          {note.hashtags.map((t) => (
            <button key={t} type="button" onClick={() => onTag(t)} className="h-7 rounded-md bg-ink-3 px-2 text-sm text-dim hover:text-paper">{t}</button>
          ))}
        </div>
      )}
    </li>
  )
}
