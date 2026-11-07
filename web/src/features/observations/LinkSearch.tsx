/**
 * Link something by typing, not scrolling: a search box that shows the three best matches (every
 * word has to appear). Tap one to link it; the box clears and stays ready for the next. Focused
 * and empty, it suggests three to start from (the caller's order: same topic first, newest).
 * Like linking a page in Notion or an issue in GitHub.
 */
import { Link2, Search } from 'lucide-react'
import { useId, useState } from 'react'
import { matchesWords } from '../../lib/search'

export interface Linkable {
  id: string
  text: string
  /** A quiet second line: its topic, or what it is. */
  sub?: string
}

const SHOWN = 3

export function LinkSearch({ items, placeholder, onPick }: { items: Linkable[]; placeholder: string; onPick: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const listId = useId()
  const found = items.filter((i) => matchesWords(query, [i.text, i.sub ?? ''])).slice(0, SHOWN)
  const pick = (id: string) => {
    onPick(id)
    setQuery('')
  }

  return (
    <div className="relative">
      <Search size={17} className="pointer-events-none absolute top-[22px] left-3 -translate-y-1/2 text-faint" />
      <input type="search" value={query} placeholder={placeholder} aria-label={placeholder} aria-controls={listId} aria-expanded={open}
        onChange={(e) => setQuery(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Enter' && found[0]) { e.preventDefault(); pick(found[0].id) } if (e.key === 'Escape') setQuery('') }}
        className="h-11 w-full rounded-xl bg-ink-2 pr-3 pl-10 text-[15px] text-paper ring-1 ring-rule outline-none placeholder:text-faint focus:ring-2 focus:ring-paper/40" />
      {open && (
        <ul id={listId} role="listbox" aria-label="Matches" className="mt-1.5 overflow-hidden rounded-xl bg-ink-2 ring-1 ring-rule">
          {found.length === 0 ? (
            <li className="px-4 py-3 text-sm text-dim">{items.length ? 'Nothing matches. Try fewer words.' : 'Nothing left to link.'}</li>
          ) : found.map((i) => (
            // Keeps the box focused, so a tap links and you can type the next one straight away.
            <li key={i.id} role="option" aria-selected={false} className="border-t border-rule first:border-t-0">
              <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => pick(i.id)}
                className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-ink-3">
                <Link2 size={15} className="mt-1 shrink-0 text-tape" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[15px] leading-snug">{i.text}</span>
                  {i.sub && <span className="mt-0.5 block text-xs text-faint">{i.sub}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
