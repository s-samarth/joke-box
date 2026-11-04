/**
 * In Log a show: the jokes you did, in running order, each with how it went. Ticking a set fills
 * this in; a joke can be added or taken off by hand. Unrated until you tap one.
 */
import { X } from 'lucide-react'
import type { Joke, LogJoke, ShowResult } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'

const RESULTS: { value: ShowResult; label: string; on: string }[] = [
  { value: 'bombed', label: 'Bombed', on: 'bg-light text-ink' },
  { value: 'ok', label: 'OK', on: 'bg-paper text-ink' },
  { value: 'killed', label: 'Killed', on: 'bg-tape text-ink' },
]

export function ShowJokesField({ done, jokes, onChange }: { done: LogJoke[]; jokes: Joke[]; onChange: (next: LogJoke[]) => void }) {
  const byId = new Map(jokes.map((j) => [j.id, j]))
  const shown = done.filter((d) => byId.has(d.joke_id)) // one deleted since isn't listed
  const others = jokes.filter((j) => !done.some((d) => d.joke_id === j.id)).sort((a, b) => a.setup.localeCompare(b.setup))
  const rate = (id: string, result: ShowResult) =>
    onChange(done.map((d) => (d.joke_id === id ? { ...d, result: d.result === result ? null : result } : d)))

  return (
    <div className="space-y-2">
      <span className="text-sm text-dim">Jokes you did (optional; tap how each went)</span>
      {shown.length > 0 && (
        <ol className="divide-y divide-rule border-y border-rule">
          {shown.map((d, n) => (
            <li key={d.joke_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="min-w-0 flex-1 basis-48 truncate text-[15px]"><span className="text-faint">{n + 1}.</span> {byId.get(d.joke_id)?.setup}</span>
              <div className="flex items-center gap-1" role="group" aria-label={`How it went: ${byId.get(d.joke_id)?.setup}`}>
                {RESULTS.map((r) => (
                  <button key={r.value} type="button" aria-pressed={d.result === r.value} onClick={() => rate(d.joke_id, r.value)}
                    className={`h-11 min-w-16 rounded-lg px-2.5 text-sm transition ${d.result === r.value ? `${r.on} font-medium` : 'bg-ink-3 text-dim hover:text-paper'}`}>
                    {r.label}
                  </button>
                ))}
                <IconButton label="Take off this show" className="size-11" onClick={() => onChange(done.filter((x) => x.joke_id !== d.joke_id))}><X size={18} /></IconButton>
              </div>
            </li>
          ))}
        </ol>
      )}
      {others.length > 0 && (
        <Select aria-label="Add a joke you did" value="" onChange={(e) => e.target.value && onChange([...done, { joke_id: e.target.value, result: null }])}>
          <option value="">Add a joke you did…</option>
          {others.map((j) => <option key={j.id} value={j.id}>{j.setup.slice(0, 80)}</option>)}
        </Select>
      )}
    </div>
  )
}
