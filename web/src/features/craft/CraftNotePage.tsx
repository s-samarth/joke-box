/**
 * One craft note. It opens formatted, with tick boxes you can tick and blocks you can tap to edit
 * in place; Edit note switches to the full form. /craft/new opens the form straight away:
 * ?area=<id> and ?kind= fill those in, ?screen= picks the area that shows on that screen, and
 * ?show= or ?analysis= link the new note to the show or analysis it was learned from.
 */
import { ArrowLeft, ChevronDown, ExternalLink, Pencil } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { newId } from '../../api/client'
import { craftInput, useCraftAreas, useCraftKinds, useCraftNotes, useDeleteCraftNote, useSaveCraftNote } from '../../api/craft'
import { useLogs } from '../../api/shows'
import { useAnalyses } from '../../api/study'
import type { Behaviour, CraftArea, CraftNote, CraftNoteInput, CraftScreen, NoteKind } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/pieces'
import { Dropdown } from '../../components/ui/Menu'
import { useFeedback } from '../../components/ui/feedbackContext'
import { formatDate } from '../../lib/time'
import { toggleTick } from './bodyFormat'
import { BEHAVIOURS, SCREENS, areaColor, areaFor, blankNote, kindFor, kindName } from './craftMeta'
import { CraftNoteForm } from './CraftNoteForm'
import { EditableBody } from './EditableBody'
import { announceSave } from '../../lib/announce'

interface ReadingProps {
  note: CraftNote
  areas: CraftArea[]
  kinds: NoteKind[]
  onEdit: () => void
  onTick: (line: number) => void
  onBody: (body: string) => void
  onMove: (area: CraftArea) => void
}

function Reading({ note, areas, kinds, onEdit, onTick, onBody, onMove }: ReadingProps) {
  const { toast } = useFeedback()
  const area = areas.find((a) => a.id === note.area_id)
  const moves = areas.filter((a) => a.id !== note.area_id).map((a) => ({ label: a.name, onSelect: () => onMove(a) }))
  return (
    <article style={{ '--area': areaColor(area?.color ?? 'sky') } as CSSProperties}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Dropdown align="start" items={moves} trigger={
          <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--area)_18%,transparent)] px-3 text-[var(--area)] hover:bg-[color-mix(in_srgb,var(--area)_28%,transparent)]" aria-label={`Area: ${area?.name ?? 'none'}. Move to another area`}>
            <span className="size-2 rounded-full bg-[var(--area)]" aria-hidden />{area?.name ?? 'No area'}<ChevronDown size={14} />
          </button>
        } />
        <span className="text-faint">{kindName(kinds, note.kind_id)}</span>
      </div>
      <h1 className="headline mt-3 text-[40px] leading-none sm:text-[52px]">{note.title}</h1>
      <div className="mt-6">
        <EditableBody key={note.id} body={note.body} onTick={onTick} onChange={onBody}
          onLost={() => toast('That part changed while you were editing it, so your edit wasn’t saved. Copy it and try again.')} />
      </div>
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4 text-sm text-faint">
        <span>
          {note.source && <>From {note.source}. </>}Written {formatDate(note.created_at)}.
          {note.analysis_id && <> <Link to={`/analysis/${note.analysis_id}`} className="text-dim hover:text-paper">Open the analysis</Link></>}
          {note.url && <> <a href={note.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-dim hover:text-paper">Link <ExternalLink size={13} /></a></>}
          {note.hashtags.length > 0 && <span className="mt-1 block text-dim">{note.hashtags.join(' ')}</span>}
        </span>
        <Button small icon={<Pencil size={15} />} onClick={onEdit}>Edit note</Button>
      </footer>
    </article>
  )
}

const isBehaviour = (v: string | null): v is Behaviour => BEHAVIOURS.some((b) => b.key === v)
const isScreen = (v: string | null): v is CraftScreen => SCREENS.some((s) => s.key === v)

export function CraftNotePage() {
  const { noteId = 'new' } = useParams()
  const [params] = useSearchParams()
  const [freshId] = useState(newId)
  const [editing, setEditing] = useState(false)
  const { data: notes = [], isPending } = useCraftNotes()
  const { data: areas = [], isPending: areasPending } = useCraftAreas()
  const { data: kinds = [], isPending: kindsPending } = useCraftKinds()
  const { data: logs = [] } = useLogs()
  const { data: analyses = [] } = useAnalyses()
  const save = useSaveCraftNote()
  const del = useDeleteCraftNote()
  const navigate = useNavigate()
  const { confirm, toast } = useFeedback()
  if (isPending || areasPending || kindsPending) return <div className="py-16"><Spinner /></div>

  const isNew = noteId === 'new'
  const note = notes.find((n) => n.id === noteId)
  const kind = params.get('kind')
  const screen = params.get('screen')
  const askedArea = areas.find((a) => a.id === params.get('area'))?.id
  const show = logs.find((l) => l.id === params.get('show'))
  const analysis = analyses.find((a) => a.id === params.get('analysis'))
  const learnedAt: Partial<CraftNoteInput> = show
    ? { performance_log_id: show.id, source: `Show at ${show.venue_name}, ${formatDate(show.performed_at)}` }
    : analysis ? { analysis_id: analysis.id, source: `Analysis: ${analysis.title}`, url: analysis.url } : {}
  const areaId = askedArea ?? areaFor(areas, isScreen(screen) ? screen : undefined)
  const filing = { area_id: areaId, kind_id: kindFor(kinds, isBehaviour(kind) ? kind : 'reference') }
  const initial: CraftNoteInput = note ? craftInput(note) : blankNote(notes, filing, learnedAt)
  const id = note?.id ?? freshId
  const back = note ? `/craft/area/${note.area_id}` : askedArea ? `/craft/area/${askedArea}` : '/craft'
  const backLabel = areas.find((a) => a.id === (note?.area_id ?? askedArea))?.name ?? 'Craft'

  const store = (input: CraftNoteInput) => {
    const saving = save.mutateAsync({ id, input: isNew ? { ...input, created_at: new Date().toISOString() } : input })
    saving.catch((e: Error) => toast(`Not saved: ${e.message}`))
    return saving
  }
  const submit = (input: CraftNoteInput) => {
    announceSave(store(input), toast, 'Note saved')
    if (isNew) navigate(`/craft/${id}`, { replace: true })
    setEditing(false)
  }
  const remove = async () => {
    if (!(await confirm({ title: 'Delete this note?', message: 'It goes to the Trash for 30 days.', confirmLabel: 'Delete', danger: true }))) return
    del.mutate(id)
    navigate(back)
  }

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="pt-6 pb-5 lg:pt-10">
        <Link to={back} className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-paper"><ArrowLeft size={15} /> {backLabel}</Link>
        {(isNew || editing) && <h1 className="headline mt-2 text-[44px] sm:text-[56px]">{isNew ? 'New note' : 'Edit note'}</h1>}
      </div>
      {!isNew && !note ? (
        <p className="text-dim">This note isn't here. It may have been deleted.</p>
      ) : isNew || editing || !note ? (
        <CraftNoteForm key={`${id}${show?.id ?? ''}${analysis?.id ?? ''}`} initial={initial} isNew={isNew} onSave={submit} onDelete={isNew ? undefined : remove} />
      ) : (
        <Reading note={note} areas={areas} kinds={kinds} onEdit={() => { setEditing(true); window.scrollTo(0, 0) }}
          onTick={(line) => store({ ...craftInput(note), body: toggleTick(note.body, line) })}
          onBody={(body) => announceSave(store({ ...craftInput(note), body }), toast, null)}
          onMove={(a) => { void store({ ...craftInput(note), area_id: a.id }); toast(`Moved to ${a.name}`) }} />
      )}
    </div>
  )
}
