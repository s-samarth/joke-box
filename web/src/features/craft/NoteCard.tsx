/**
 * One craft note as a card whose face depends on how its kind behaves: a checklist shows its first boxes,
 * a technique a prompt and Start, a path its progress, a reference the start of the text.
 * The ⋯ menu moves it to another area or deletes it.
 *
 * Pattern: a stretched link (its ::after covers the card) makes the whole card one tap target,
 * while the menu and Start sit above it (relative z-10) and stay tappable on their own.
 */
import { MoreHorizontal } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router'
import { newId } from '../../api/client'
import { craftInput, useCraftKinds, useDeleteCraftNote, useSaveCraftNote } from '../../api/craft'
import type { CraftArea, CraftNote } from '../../api/types'
import { Dropdown, type MenuItem } from '../../components/ui/Menu'
import { useFeedback } from '../../components/ui/feedbackContext'
import { listItems, prompts } from './bodyFormat'
import { areaColor, kindName, plainText } from './craftMeta'
import { KIND_ICONS } from './kindIcons'

function Face({ note }: { note: CraftNote }) {
  const navigate = useNavigate()
  if (note.behaviour === 'checklist') {
    const items = listItems(note.body)
    return (
      <ul className="mt-2.5 space-y-1.5 text-sm text-dim">
        {items.slice(0, 3).map((i) => (
          <li key={i.line} className="flex gap-2"><span className="mt-0.5 size-3.5 shrink-0 rounded-[4px] ring-1 ring-rule-strong" /><span className="line-clamp-1">{plainText(i.text)}</span></li>
        ))}
        {items.length > 3 && <li className="pl-5.5 text-faint">and {items.length - 3} more</li>}
      </ul>
    )
  }
  if (note.behaviour === 'technique') {
    const list = prompts(note.body)
    return (
      <>
        <p className="mt-2.5 line-clamp-3 text-sm text-dim">{list.length ? `“${list[0]}”` : plainText(note.body)}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-faint tabular">{list.length ? `${list.length} prompts` : ''}</span>
          <button type="button" onClick={() => navigate(`/brainstorm/${newId()}?technique=${note.id}`)} className="relative z-10 h-8 rounded-lg bg-tape px-3 text-sm font-semibold text-tape-ink hover:bg-[#f5da77]">Start</button>
        </div>
      </>
    )
  }
  if (note.behaviour === 'path') {
    const boxes = listItems(note.body).filter((i) => i.checked !== null)
    if (!boxes.length) return <p className="mt-2.5 line-clamp-3 text-sm text-dim">{plainText(note.body)}</p>
    const done = boxes.filter((i) => i.checked).length
    return (
      <div className="mt-3">
        <div className="flex gap-1" aria-hidden>{boxes.map((b) => <span key={b.line} className={`h-1.5 flex-1 rounded-full ${b.checked ? 'bg-ok' : 'bg-ink-4'}`} />)}</div>
        <p className="mt-1.5 text-xs text-faint tabular">{done} of {boxes.length} done</p>
      </div>
    )
  }
  return <p className="mt-2.5 line-clamp-4 text-sm leading-relaxed text-dim">{plainText(note.body)}</p>
}

export function NoteCard({ note, areas, showArea }: { note: CraftNote; areas: CraftArea[]; showArea?: boolean }) {
  const save = useSaveCraftNote()
  const del = useDeleteCraftNote()
  const { confirm, toast } = useFeedback()
  const area = areas.find((a) => a.id === note.area_id)
  const { data: kinds = [] } = useCraftKinds()
  const Icon = KIND_ICONS[note.behaviour]
  const moveTo = (to: CraftArea) => {
    save.mutate({ id: note.id, input: { ...craftInput(note), area_id: to.id } }, { onError: (e) => toast(`Not moved: ${e.message}`) })
    toast(`Moved to ${to.name}`)
  }
  const remove = async () => {
    if (await confirm({ title: `Delete ${note.title}?`, message: 'The note is deleted for good.', confirmLabel: 'Delete note', danger: true })) del.mutate(note.id)
  }
  const items: (MenuItem | 'divider')[] = [
    ...areas.filter((a) => a.id !== note.area_id).map((a) => ({ label: `Move to ${a.name}`, onSelect: () => moveTo(a) })),
    'divider',
    { label: 'Delete note', danger: true, onSelect: () => void remove() },
  ]

  return (
    <article className="group relative mb-3 break-inside-avoid overflow-hidden rounded-xl bg-ink-2 p-4 pt-4.5 ring-1 ring-rule transition-colors hover:bg-ink-3"
      style={{ '--area': areaColor(area?.color ?? 'sky') } as CSSProperties}>
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-[var(--area)] opacity-80" />
      <div className="flex items-center gap-1.5 text-xs text-[var(--area)]">
        <Icon size={14} aria-hidden />
        <span>{kindName(kinds, note.kind_id)}{showArea && area ? `, ${area.name}` : ''}</span>
        <span className="relative z-10 -my-1.5 -mr-2 ml-auto">
          <Dropdown items={items} trigger={<button type="button" aria-label={`More for ${note.title}`} className="inline-flex size-8 items-center justify-center rounded-md text-faint hover:bg-ink-4 hover:text-paper"><MoreHorizontal size={16} /></button>} />
        </span>
      </div>
      <Link to={`/craft/${note.id}`} className="mt-1.5 block leading-snug font-medium after:absolute after:inset-0 after:content-['']">{note.title}</Link>
      <Face note={note} />
    </article>
  )
}
