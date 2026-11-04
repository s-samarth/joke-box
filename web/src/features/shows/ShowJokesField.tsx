/**
 * In Log a show: how particular jokes went, folded away until you want it. Search for a joke you
 * did (the best three matches come up), tap it to add it, then mark it bombed, OK or killed and
 * jot a comment. All of it optional; ticking a set doesn't add anything here.
 */
import { X } from 'lucide-react'
import { useState } from 'react'
import type { Joke, LogJoke, ShowResult } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { findJokes } from './showJokes'

const RESULTS: { value: ShowResult; label: string; on: string }[] = [
  { value: 'bombed', label: 'Bombed', on: 'bg-light text-ink' },
  { value: 'ok', label: 'OK', on: 'bg-paper text-ink' },
  { value: 'killed', label: 'Killed', on: 'bg-tape text-ink' },
]

export function ShowJokesField({ done, jokes, onChange }: { done: LogJoke[]; jokes: Joke[]; onChange: (next: LogJoke[]) => void }) {
  const [query, setQuery] = useState('')
  const byId = new Map(jokes.map((j) => [j.id, j]))
  const shown = done.filter((d) => byId.has(d.joke_id)) // one deleted since isn't listed
  const matches = findJokes(jokes, done, query)
  const change = (id: string, part: Partial<LogJoke>) => onChange(done.map((d) => (d.joke_id === id ? { ...d, ...part } : d)))
  const add = (id: string) => { onChange([...done, { joke_id: id, result: null, note: '' }]); setQuery('') }

  return (
    <details className="rounded-xl bg-ink-2 ring-1 ring-rule" open={shown.length > 0}>
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 select-none">
        <span className="text-sm text-dim">How particular jokes went</span>
        <span className="text-sm tabular">{shown.length ? `${shown.length} ${shown.length === 1 ? 'joke' : 'jokes'}` : 'Optional'}</span>
      </summary>
      <div className="space-y-3 px-4 pb-4">
        {shown.length > 0 && (
          <ul className="divide-y divide-rule border-y border-rule">
            {shown.map((d) => {
              const setup = byId.get(d.joke_id)?.setup ?? ''
              return (
                <li key={d.joke_id} className="space-y-2 py-3">
                  <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 pt-2.5 text-[15px] line-clamp-2">{setup}</span>
                    <IconButton label="Take off this show" className="size-11 shrink-0" onClick={() => onChange(done.filter((x) => x.joke_id !== d.joke_id))}><X size={18} /></IconButton>
                  </div>
                  <div className="flex items-center gap-1" role="group" aria-label={`How it went: ${setup}`}>
                    {RESULTS.map((r) => (
                      <button key={r.value} type="button" aria-pressed={d.result === r.value} onClick={() => change(d.joke_id, { result: d.result === r.value ? null : r.value })}
                        className={`h-11 min-w-16 rounded-lg px-2.5 text-sm transition ${d.result === r.value ? `${r.on} font-medium` : 'bg-ink-3 text-dim hover:text-paper'}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <Input aria-label={`Comment: ${setup}`} placeholder="Comment (optional), e.g. rushed the tag" maxLength={2000}
                    value={d.note ?? ''} onChange={(e) => change(d.joke_id, { note: e.target.value })} />
                </li>
              )
            })}
          </ul>
        )}
        <div className="space-y-1">
          <Input type="search" aria-label="Search for a joke you did" placeholder="Search for a joke you did" value={query}
            onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (matches[0]) add(matches[0].id) } }} />
          {query.trim() !== '' && (
            matches.length
              ? <ul className="divide-y divide-rule">{matches.map((j) => (
                <li key={j.id}><button type="button" onClick={() => add(j.id)} className="block min-h-11 w-full py-2.5 text-left text-[15px] hover:text-tape">
                  <span className="line-clamp-2">{j.setup}</span>
                </button></li>
              ))}</ul>
              : <p className="py-2 text-sm text-faint">No joke matches that.</p>
          )}
        </div>
      </div>
    </details>
  )
}
