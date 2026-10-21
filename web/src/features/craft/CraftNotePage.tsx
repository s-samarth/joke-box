/**
 * One craft note. It opens formatted, with tick boxes you can tick, and switches to a form to
 * edit. /craft/new opens the form straight away; ?area= and ?kind= fill those in.
 */
import { ArrowLeft, ExternalLink, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { newId } from '../../api/client'
import { craftInput, useCraftNotes, useDeleteCraftNote, useSaveCraftNote } from '../../api/craft'
import type { CraftArea, CraftKind, CraftNote, CraftNoteInput } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/bits'
import { useFeedback } from '../../components/ui/feedbackContext'
import { formatDate } from '../../lib/time'
import { AREAS, KINDS, areaLabel, blankNote, kindLabel } from './craftMeta'
import { CraftNoteForm } from './CraftNoteForm'
import { NoteBody } from './NoteBody'
import { toggleTick } from './bodyFormat'

function Reading({ note, onEdit, onTick }: { note: CraftNote; onEdit: () => void; onTick: (line: number) => void }) {
  return (
    <article>
      <p className="text-sm text-faint">{kindLabel(note.kind)}, {areaLabel(note.area)}</p>
      <h1 className="headline mt-1 text-[40px] leading-none sm:text-[52px]">{note.title}</h1>
      <div className="mt-6"><NoteBody body={note.body} onTick={onTick} /></div>
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4 text-sm text-faint">
        <span>
          {note.source && <>From {note.source}. </>}Written {formatDate(note.created_at)}
          {note.url && <> · <a href={note.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-dim hover:text-paper">Link <ExternalLink size={13} /></a></>}
          {note.hashtags.length > 0 && <span className="mt-1 block text-dim">{note.hashtags.join(' ')}</span>}
        </span>
        <Button small icon={<Pencil size={15} />} onClick={onEdit}>Edit note</Button>
      </footer>
    </article>
  )
}

const isArea = (v: string | null): v is CraftArea => AREAS.some((a) => a.key === v)
const isKind = (v: string | null): v is CraftKind => KINDS.some((k) => k.key === v)

export function CraftNotePage() {
  const { noteId = 'new' } = useParams()
  const [params] = useSearchParams()
  const [freshId] = useState(newId)
  const [editing, setEditing] = useState(false)
  const { data: notes = [], isPending } = useCraftNotes()
  const save = useSaveCraftNote()
  const del = useDeleteCraftNote()
  const navigate = useNavigate()
  const { confirm, toast } = useFeedback()
  if (isPending) return <div className="py-16"><Spinner /></div>

  const isNew = noteId === 'new'
  const note = notes.find((n) => n.id === noteId)
  const area = params.get('area')
  const kind = params.get('kind')
  const initial: CraftNoteInput = note ? craftInput(note) : blankNote(notes, { ...(isArea(area) && { area }), ...(isKind(kind) && { kind }) })
  const id = note?.id ?? freshId

  const store = (input: CraftNoteInput) => save.mutate({ id, input }, { onError: (e) => toast(`Not saved: ${e.message}`) })
  const submit = (input: CraftNoteInput) => {
    store(input)
    toast(navigator.onLine ? 'Note saved' : 'Saved offline, will sync')
    if (isNew) navigate(`/craft/${id}`, { replace: true })
    setEditing(false)
  }
  const remove = async () => {
    if (!(await confirm({ title: 'Delete this note?', message: 'It is deleted for good.', confirmLabel: 'Delete', danger: true }))) return
    del.mutate(id)
    navigate('/craft')
  }

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="pt-6 pb-5 lg:pt-10">
        <Link to="/craft" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-paper"><ArrowLeft size={15} /> All craft notes</Link>
        {(isNew || editing) && <h1 className="headline mt-2 text-[44px] sm:text-[56px]">{isNew ? 'New note' : 'Edit note'}</h1>}
      </div>
      {!isNew && !note ? (
        <p className="text-dim">This note isn't here. It may have been deleted.</p>
      ) : isNew || editing || !note ? (
        <CraftNoteForm key={id} initial={initial} isNew={isNew} onSave={submit} onDelete={isNew ? undefined : remove} />
      ) : (
        <Reading note={note} onEdit={() => { setEditing(true); window.scrollTo(0, 0) }} onTick={(line) => store({ ...craftInput(note), body: toggleTick(note.body, line) })} />
      )}
    </div>
  )
}
