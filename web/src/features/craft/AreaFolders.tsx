/**
 * Your craft areas as folders in their own colours, like the topic folders on Home: the tab
 * carries the count, the card names the area, says what kinds of notes are in it and lists the
 * first few. The last tile adds an area.
 */
import { Folder, Plus } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import type { CraftKind } from '../../api/types'
import { AREA_COLORS, KINDS, type AreaGroup } from './craftMeta'
import { KIND_ICONS } from './kindIcons'

const PREVIEW = 2

function FolderCard({ group }: { group: AreaGroup }) {
  const { area, notes } = group
  const kinds = KINDS.map((k) => ({ key: k.key as CraftKind, label: k.label, count: notes.filter((n) => n.kind === k.key).length })).filter((k) => k.count)
  return (
    <li className="group relative mt-[18px]" style={{ '--area': AREA_COLORS[area.color] } as CSSProperties}>
      <span aria-hidden className="absolute -top-[18px] left-3 flex h-[18px] min-w-12 items-center justify-center rounded-t-md bg-[var(--area)] px-2 text-xs font-semibold text-ink tabular">{notes.length}</span>
      <div className="relative flex h-full flex-col rounded-xl rounded-tl-sm bg-[linear-gradient(160deg,color-mix(in_srgb,var(--area)_16%,transparent),transparent_55%)] bg-ink-2 p-4 ring-1 ring-rule transition-colors group-hover:ring-[var(--area)]">
        <Link to={`/craft/area/${area.id}`} className="flex items-start gap-2 after:absolute after:inset-0 after:rounded-xl after:content-['']">
          <Folder size={18} className="mt-1 shrink-0 text-[var(--area)]" aria-hidden />
          <span className="headline min-w-0 flex-1 text-[22px] leading-tight break-words">{area.name}</span>
        </Link>
        {area.description && <p className="mt-1 line-clamp-2 text-sm text-faint">{area.description}</p>}
        {notes.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-dim">
            {notes.slice(0, PREVIEW).map((n) => <li key={n.id} className="truncate">{n.title}</li>)}
            {notes.length > PREVIEW && <li className="text-faint">and {notes.length - PREVIEW} more</li>}
          </ul>
        )}
        {kinds.length > 0 && (
          <p className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-xs text-faint">
            {kinds.map((k) => {
              const Icon = KIND_ICONS[k.key]
              return <span key={k.key} className="inline-flex items-center gap-1" title={`${k.count} ${k.label.toLowerCase()}`}><Icon size={13} className="text-[var(--area)]" aria-hidden />{k.count}</span>
            })}
          </p>
        )}
      </div>
    </li>
  )
}

export function AreaFolders({ groups, onAdd }: { groups: AreaGroup[]; onAdd: () => void }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {groups.map((g) => <FolderCard key={g.area.id} group={g} />)}
      <li className="mt-[18px]">
        <button type="button" onClick={onAdd} className="flex h-full min-h-28 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-rule-strong text-dim transition-colors hover:border-paper/40 hover:text-paper">
          <Plus size={20} aria-hidden />
          <span className="text-sm">New area</span>
        </button>
      </li>
    </ul>
  )
}
