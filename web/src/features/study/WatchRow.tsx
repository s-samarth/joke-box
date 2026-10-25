/** One routine: tick it watched, read its notes, open it to watch, start an analysis, or delete it. */
import { Check, ExternalLink, NotebookPen, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { WatchItem } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { NoteBody } from '../craft/NoteBody'
import { SCORES, watchUrl } from './watchMeta'

interface Props {
  item: WatchItem
  onToggle: () => void
  onDelete: () => void
}

export function WatchRow({ item, onToggle, onDelete }: Props) {
  const scores = SCORES.filter((s) => item[s.key] !== null)
  const [open, setOpen] = useState(false)
  // Only long notes get More; a line or two already shows in full.
  const long = item.description.length > 140 || item.description.includes('\n')
  return (
    <li className="flex gap-3 py-3.5">
      <button type="button" role="checkbox" aria-checked={item.watched} onClick={onToggle}
        aria-label={`${item.watched ? 'Mark as not watched' : 'Mark as watched'}: ${item.title}`}
        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ring-1 transition-colors ${item.watched ? 'bg-ok text-ink ring-ok' : 'ring-rule-strong hover:ring-paper/60'}`}>
        {item.watched && <Check size={16} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`leading-snug ${item.watched ? 'text-dim' : 'font-medium'}`}>
          {item.position > 0 && <span className="mr-1.5 text-sm text-faint tabular">#{item.position}</span>}
          {item.title}
        </p>
        {item.comedian && <p className="text-sm text-dim">{item.comedian}</p>}
        {item.description && (open
          ? <div className="mt-1 text-sm [&_*]:text-sm"><NoteBody body={item.description} /></div>
          : <p className="mt-1 line-clamp-2 text-sm whitespace-pre-line text-faint">{item.description}</p>)}
        {long && (
          <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="mt-0.5 text-sm text-dim underline-offset-2 hover:text-paper hover:underline">
            {open ? 'Less' : 'More'}
          </button>
        )}
        {scores.length > 0 && (
          <p className="mt-1.5 flex gap-1.5">
            {scores.map((s) => (
              <span key={s.key} title={`${s.name}: ${s.hint}`} className="rounded bg-ink-3 px-1.5 py-0.5 text-xs text-dim tabular">
                {s.short} {item[s.key]}
              </span>
            ))}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-start">
        <a href={watchUrl(item)} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${item.title}`} title={item.url ? 'Open link' : 'Search YouTube'}
          className="inline-flex size-10 items-center justify-center rounded-lg text-dim hover:bg-ink-3 hover:text-paper">
          <ExternalLink size={17} />
        </a>
        <Link to={`/analysis/new?watch=${item.id}`} aria-label={`Write an analysis of ${item.title}`} title="Write an analysis"
          className="inline-flex size-10 items-center justify-center rounded-lg text-dim hover:bg-ink-3 hover:text-paper">
          <NotebookPen size={17} />
        </Link>
        <IconButton label={`Delete ${item.title}`} onClick={onDelete} className="hover:text-light"><Trash2 size={16} /></IconButton>
      </div>
    </li>
  )
}
