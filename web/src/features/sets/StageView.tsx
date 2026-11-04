/**
 * Rehearse: the whole set as a script to read through before a show. Every joke in full (setup,
 * punchline, tag lines) in one scrolling column, numbered, with its runtime and where you should
 * be on the clock by the end of it.
 *
 * The clock stays pinned at the top and follows the open-mic light: amber with a minute to go,
 * red when you're over. The screen stays awake.
 */
import { GraduationCap, Pause, Play, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useJokes } from '../../api/library'
import { useSetlists } from '../../api/shows'
import { clock } from '../../lib/duration'
import { useWakeLock } from '../../lib/useWakeLock'
import { useTimer } from '../jokes/useTimer'
import { CraftSheet } from '../craft/CraftSheet'
import { lightState, positionLabel } from './setlistMath'

const icon = 'inline-flex size-11 items-center justify-center rounded-lg text-faint hover:text-paper'

export function StageView() {
  const { setId } = useParams()
  const { data: sets = [] } = useSetlists()
  const { data: jokes = [] } = useJokes()
  const [notes, setNotes] = useState(false)
  const timer = useTimer()
  useWakeLock()

  const setlist = sets.find((s) => s.id === setId)
  if (!setlist) return <div className="p-8 text-dim">Set not found. <Link to="/sets" className="text-tape">Back to sets</Link></div>
  const items = setlist.items.map((i) => ({ ...i, joke: jokes.find((b) => b.id === i.joke_id) }))
  // When each joke ends if you do the sure ones; an optional joke is marked instead.
  const ends = items.map((_, i) => items.slice(0, i + 1).reduce((sum, it) => sum + (it.optional ? 0 : it.duration_seconds), 0))
  const state = lightState(timer.seconds, setlist.target_seconds)
  const clockTone = state === 'over' ? 'text-light light-pulse' : state === 'light' ? 'text-amber' : 'text-paper'

  return (
    <div className="pt-safe pb-safe fixed inset-0 flex flex-col bg-[#0f121a]">
      <header className="flex items-center gap-2 border-b border-rule px-3 py-2">
        <Link to={`/sets/${setlist.id}`} aria-label="Leave rehearsal" className={icon}><X size={24} /></Link>
        <span className={`headline text-4xl tabular ${clockTone}`} aria-live="off">{clock(timer.seconds)}</span>
        <span className="text-faint tabular">/ {clock(setlist.target_seconds)}</span>
        {state === 'light' && <span className="ml-1 inline-flex items-center gap-1.5 text-sm text-amber"><span className="size-2.5 rounded-full bg-amber" />Light</span>}
        <div className="ml-auto flex gap-1">
          <button type="button" onClick={() => setNotes(true)} aria-label="Before you go on" title="Before you go on" className={icon}><GraduationCap size={20} /></button>
          <button type="button" onClick={timer.reset} aria-label="Reset clock" className={icon}><RotateCcw size={20} /></button>
          <button type="button" onClick={timer.running ? timer.pause : timer.start} aria-label={timer.running ? 'Pause clock' : 'Start clock'}
            className="inline-flex size-11 items-center justify-center rounded-lg bg-tape text-tape-ink">{timer.running ? <Pause size={20} /> : <Play size={20} />}</button>
        </div>
      </header>
      <article className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
          <h1 className="headline text-4xl">{setlist.name}</h1>
          <p className="mt-1 text-dim">{items.length} {items.length === 1 ? 'joke' : 'jokes'}, {clock(setlist.target_seconds)} slot</p>
          <ol className="mt-8 space-y-8">
            {items.length === 0 && <li className="text-xl text-dim">This set is empty.</li>}
            {items.map((it, i) => {
              const place = positionLabel(i, items.length)
              return (
                <li key={it.joke_id} className="border-t border-rule pt-6">
                  <p className="flex items-baseline gap-3 text-sm text-faint">
                    <span className="text-lg font-semibold text-tape tabular">{i + 1}</span>
                    {place && <span>{place}</span>}
                    {it.optional && <span>Optional</span>}
                    <span className="ml-auto tabular">{clock(it.duration_seconds)}{it.optional ? '' : `, by ${clock(ends[i])}`}</span>
                  </p>
                  <p className="mt-2 text-2xl leading-snug font-medium whitespace-pre-wrap text-paper">{it.joke?.setup ?? 'Deleted joke'}</p>
                  {it.joke?.punchline && <p className="mt-3 text-xl leading-snug whitespace-pre-wrap text-tape">{it.joke.punchline}</p>}
                  {it.joke?.tag_lines.filter((t) => t.trim()).map((t, n) => (
                    <p key={n} className="mt-2 flex gap-2 text-lg leading-snug whitespace-pre-wrap text-paper/80"><span className="text-tape" aria-hidden>+</span>{t}</p>
                  ))}
                </li>
              )
            })}
          </ol>
        </div>
      </article>
      <CraftSheet open={notes} onOpenChange={setNotes} title="Before you go on" screen="stage" empty="No notes in the areas that show on Stage." />
    </div>
  )
}
