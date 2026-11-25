/**
 * On stage: the set one beat at a time (docs/sets.md). The beat's cue, its time on the clock,
 * and its list with each joke's punchline as the cue line, coloured as in the builder: yellow
 * locked, teal loose, blue gate. Answer each gate as you reach it; what it guards is struck out
 * if it didn't land. Tap an answered gate to take the answer back. Next always means the next beat.
 *
 * The clock stays pinned at the top and follows the open-mic light: amber with a minute to go,
 * red when you're over. The screen stays awake.
 */
import { GitFork, GraduationCap, Pause, Play, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useJokes } from '../../api/library'
import { usePremises } from '../../api/premises'
import { useSetlists } from '../../api/shows'
import { Tape } from '../../components/ui/pieces'
import { clock } from '../../lib/duration'
import { useWakeLock } from '../../lib/useWakeLock'
import { useTimer } from '../jokes/useTimer'
import { CraftSheet } from '../craft/CraftSheet'
import { beatTotal, beatsOf } from './beats'
import { lightState } from './setlistMath'
import { type Answers, starts, walk } from './stageWalk'

const icon = 'inline-flex size-11 items-center justify-center rounded-lg text-faint hover:text-paper'
const clip = (text = 'that joke') => (text.length > 48 ? `${text.slice(0, 47)}…` : text)
const colour = (gate: number, loose: boolean) => (gate ? 'text-sky' : loose ? 'text-teal' : 'text-tape')

export function StageView() {
  const { setId } = useParams()
  const { data: sets = [] } = useSetlists()
  const { data: jokes = [] } = useJokes()
  const { data: premiseList = [] } = usePremises()
  const [notes, setNotes] = useState(false)
  const [at, setAt] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const timer = useTimer()
  const wake = useWakeLock()

  const setlist = sets.find((s) => s.id === setId)
  if (!setlist) return <div className="p-8 text-dim">Set not found. <Link to="/sets" className="text-tape">Back to sets</Link></div>
  const beats = beatsOf(setlist)
  const byId = new Map(jokes.map((j) => [j.id, j]))
  const premises = new Map(premiseList.map((p) => [p.id, p]))
  const target = setlist.target_seconds || beatTotal(beats)
  const state = lightState(timer.seconds, target)
  const clockTone = state === 'over' ? 'text-light light-pulse' : state === 'light' ? 'text-amber' : 'text-paper'
  const i = Math.min(at, Math.max(0, beats.length - 1))
  const beat = beats[i]
  const begin = starts(beats)[i] ?? 0
  const { rows, pending } = beat ? walk(beat, answers) : { rows: [], pending: null }
  const answer = (key: string, landed: boolean) => setAnswers((a) => ({ ...a, [key]: landed }))
  const unanswer = (key: string) => setAnswers((a) => { const next = { ...a }; delete next[key]; return next })

  return (
    <div className="pt-safe pb-safe fixed inset-0 flex flex-col bg-[#0f121a]">
      <header className="flex items-center gap-2 border-b border-rule px-3 py-2">
        <Link to={`/sets/${setlist.id}`} aria-label="Leave" className={icon}><X size={24} /></Link>
        <span className={`headline text-4xl tabular ${clockTone}`} aria-live="off">{clock(timer.seconds)}</span>
        <span className="text-faint tabular">/ {clock(target)}</span>
        {wake === 'refused' && <span className="ml-1 text-sm text-amber" title="This phone wouldn't keep the screen on: it may lock mid-set">Screen may lock</span>}
        {state === 'light' && <span className="ml-1 inline-flex items-center gap-1.5 text-sm text-amber"><span className="size-2.5 rounded-full bg-amber" />Light</span>}
        <div className="ml-auto flex gap-1">
          <button type="button" onClick={() => setNotes(true)} aria-label="Before you go on" title="Before you go on" className={icon}><GraduationCap size={20} /></button>
          <button type="button" onClick={timer.reset} aria-label="Reset clock" className={icon}><RotateCcw size={20} /></button>
          <button type="button" onClick={timer.running ? timer.pause : timer.start} aria-label={timer.running ? 'Pause clock' : 'Start clock'}
            className="inline-flex size-11 items-center justify-center rounded-lg bg-tape text-tape-ink">{timer.running ? <Pause size={20} /> : <Play size={20} />}</button>
        </div>
      </header>
      <nav className="flex gap-1.5 overflow-x-auto border-b border-rule px-3 py-2" aria-label="Beats">
        {beats.map((b, n) => (
          <button key={b.id} type="button" onClick={() => setAt(n)} aria-current={n === i}
            className={`shrink-0 rounded-full px-3 py-1 text-sm ${n === i ? 'bg-tape font-semibold text-tape-ink' : n < i ? 'text-faint' : 'bg-ink-3 text-dim'}`}>{b.cue || `Beat ${n + 1}`}</button>
        ))}
      </nav>
      <article key={beat?.id} className="min-h-0 flex-1 overflow-y-auto">
        {!beat ? <p className="p-8 text-xl text-dim">This set has no beats yet.</p> : (
          <div className="mx-auto max-w-2xl px-5 py-6 sm:px-8">
            <p className="text-sm text-faint">Beat {i + 1} of {beats.length} · <span className="tabular">{clock(begin)} → {clock(begin + beat.seconds)}</span></p>
            <Tape seed={i} className="mt-3 text-3xl">{beat.cue || `Beat ${i + 1}`}</Tape>
            {beat.description && <p className="mt-3 text-dim">{beat.description}</p>}
            <ol className="mt-6 space-y-3">
              {rows.map((r) => {
                if (r.kind === 'crowd') return (
                  <li key={r.key} className="rounded-lg bg-orchid/10 p-3 ring-1 ring-orchid/30">
                    <p className="text-sm font-semibold text-orchid">Crowd work{r.entry.title ? ` · ${r.entry.title}` : ''}</p>
                    {r.entry.questions.map((q) => (
                      <div key={q.id} className="mt-2">
                        <p className="text-lg">{q.text || 'A question'} {!q.has_reply && <span className="text-sm text-amber">(no reply yet)</span>}</p>
                        {q.replies.map((rep) => <p key={rep.id} className="text-dim">{rep.when} → <i className="text-paper">{rep.line}</i></p>)}
                      </div>
                    ))}
                  </li>
                )
                if (r.kind === 'premise') {
                  const said = r.gated && answers[r.key] !== undefined
                  return (
                    <li key={r.key} className={`pt-3 ${r.key === pending?.key ? 'rounded-lg ring-2 ring-sky' : ''}`}>
                      <button type="button" disabled={!said} onClick={() => unanswer(r.key)} title={said ? 'Take this answer back' : undefined}
                        className={`flex w-full gap-2 text-left text-[13px] font-semibold tracking-[0.1em] uppercase ${r.skipped ? 'text-faint line-through' : r.gated ? 'text-sky' : 'text-faint'}`}>
                        {r.gated && 'Gate · '}{(r.entry.premise_id && premises.get(r.entry.premise_id)?.take) || 'Premise'}
                        {said && <span className="ml-auto shrink-0 font-normal tracking-normal normal-case">{answers[r.key] ? 'landed' : "didn't"}</span>}
                      </button>
                    </li>
                  )
                }
                const joke = byId.get(r.piece.joke_id)
                const answered = r.piece.gate > 0 && answers[r.key] !== undefined
                return (
                  <li key={r.key} className={`${r.guarded ? 'ml-5 border-l-2 border-dashed border-sky/40 pl-3' : ''} ${r.skipped ? 'opacity-35' : ''} ${r.key === pending?.key ? 'rounded-lg ring-2 ring-sky ring-offset-4 ring-offset-[#0f121a]' : ''}`}>
                    <button type="button" disabled={!answered} onClick={() => unanswer(r.key)} className="block w-full text-left" title={answered ? 'Take this answer back' : undefined}>
                      <p className="line-clamp-2 text-dim">{joke?.setup ?? 'Deleted joke'}</p>
                      <p className={`flex items-start gap-2 text-xl leading-snug font-medium ${colour(r.piece.gate, r.piece.loose)} ${r.skipped ? 'line-through' : ''}`}>
                        {r.piece.gate > 0 && <GitFork size={18} className="mt-1 shrink-0" aria-label="Gate" />}{joke?.punchline || joke?.setup}
                        {answered && <span className="ml-auto shrink-0 text-sm font-normal text-faint">{answers[r.key] ? 'landed' : "didn't"}</span>}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </article>
      {beat && (
        <footer className="grid gap-2 border-t border-rule px-3 py-3 sm:flex sm:justify-center">
          {pending ? (
            <>
              <p className="text-center text-sm text-sky sm:self-center">{pending.premise ? 'Gate: did the premise before land?' : `Gate: did “${clip(byId.get(pending.jokeId ?? '')?.punchline || byId.get(pending.jokeId ?? '')?.setup)}” land?`}</p>
              <button type="button" onClick={() => answer(pending.key, true)} className="h-12 rounded-lg bg-sky px-5 font-semibold text-ink">{pending.premise ? 'The premise before landed' : 'It landed'}</button>
              <button type="button" onClick={() => answer(pending.key, false)} className="h-12 rounded-lg bg-ink-3 px-5 text-paper">It didn't · skip what it guards</button>
            </>
          ) : i < beats.length - 1 ? (
            <button type="button" onClick={() => setAt(i + 1)} className="h-12 rounded-lg bg-tape px-5 font-semibold text-tape-ink">Next beat: {beats[i + 1].cue || `Beat ${i + 2}`}</button>
          ) : (
            <Link to={`/sets/${setlist.id}`} className="inline-flex h-12 items-center justify-center rounded-lg bg-ink-3 px-5 text-paper">That's the set · back to it</Link>
          )}
        </footer>
      )}
      <CraftSheet open={notes} onOpenChange={setNotes} title="Before you go on" screen="stage" empty="No notes in the areas that show on Stage." />
    </div>
  )
}
