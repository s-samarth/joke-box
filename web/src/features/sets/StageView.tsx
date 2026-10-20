/**
 * Rehearse or perform: the set taped down in big marker, the current bit bright and the rest
 * dimmed. The clock follows the open-mic light: amber with a minute to go, red when you're over.
 * Tap the right side for the next bit, the left to go back. The screen stays awake.
 */
import { Pause, Play, RotateCcw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useBits } from '../../api/library'
import { useSetlists } from '../../api/shows'
import { Tape } from '../../components/ui/bits'
import { clock } from '../../lib/duration'
import { useTimer } from '../bits/useTimer'
import { lightState } from './setlistMath'

function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    const request = () => navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => undefined)
    void request()
    const onVisible = () => document.visibilityState === 'visible' && void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [])
}

export function StageView() {
  const { setId } = useParams()
  const { data: sets = [] } = useSetlists()
  const { data: bits = [] } = useBits()
  const [index, setIndex] = useState(0)
  const timer = useTimer()
  const current = useRef<HTMLLIElement>(null)
  useWakeLock()
  useEffect(() => {
    // Braces matter: newer browsers return a Promise from scrollIntoView, and an effect may only return a cleanup.
    current.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [index])

  const setlist = sets.find((s) => s.id === setId)
  if (!setlist) return <div className="p-8 text-dim">Set not found. <Link to="/sets" className="text-tape">Back to sets</Link></div>
  const items = setlist.items.map((i) => ({ ...i, bit: bits.find((b) => b.id === i.bit_id) }))
  const state = lightState(timer.seconds, setlist.target_seconds)
  const go = (d: number) => setIndex((i) => Math.min(Math.max(i + d, 0), items.length - 1))
  const clockTone = state === 'over' ? 'text-light light-pulse' : state === 'light' ? 'text-amber' : 'text-paper'

  return (
    <div className="pt-safe pb-safe fixed inset-0 flex flex-col bg-[#0f121a]">
      <header className="flex items-center gap-2 px-3 py-2">
        <Link to={`/sets/${setlist.id}`} aria-label="Leave stage view" className="inline-flex size-11 items-center justify-center rounded-lg text-faint hover:text-paper"><X size={24} /></Link>
        <span className={`headline text-5xl tabular ${clockTone}`} aria-live="off">{clock(timer.seconds)}</span>
        <span className="text-faint tabular">/ {clock(setlist.target_seconds)}</span>
        {state === 'light' && <span className="ml-1 inline-flex items-center gap-1.5 text-sm text-amber"><span className="size-2.5 rounded-full bg-amber" />Light</span>}
        <div className="ml-auto flex gap-1">
          <button type="button" onClick={timer.reset} aria-label="Reset clock" className="inline-flex size-11 items-center justify-center rounded-lg text-faint hover:text-paper"><RotateCcw size={20} /></button>
          <button type="button" onClick={timer.running ? timer.pause : timer.start} aria-label={timer.running ? 'Pause clock' : 'Start clock'}
            className="inline-flex size-11 items-center justify-center rounded-lg bg-tape text-tape-ink">{timer.running ? <Pause size={20} /> : <Play size={20} />}</button>
        </div>
      </header>
      <div className="relative min-h-0 flex-1">
        <button type="button" aria-label="Previous bit" className="absolute inset-y-0 left-0 z-10 w-1/3" onClick={() => go(-1)} />
        <button type="button" aria-label="Next bit" className="absolute inset-y-0 right-0 z-10 w-2/3" onClick={() => go(1)} />
        <ol className="h-full space-y-5 overflow-y-auto px-5 py-[30vh] sm:px-16">
          {items.length === 0 && <li className="text-xl text-dim">This set is empty.</li>}
          {items.map((it, i) => (
            <li key={it.bit_id} ref={i === index ? current : undefined} aria-current={i === index ? 'step' : undefined}>
              <Tape seed={i} dim={i !== index} className={`px-5 py-4 transition ${i === index ? 'text-3xl sm:text-5xl' : 'text-2xl sm:text-3xl'}`}>
                {it.bit?.setup ?? 'Deleted bit'}
              </Tape>
              {i === index && it.bit?.punchline && <p className="mt-3 px-2 text-xl leading-snug text-paper/85 sm:text-2xl">{it.bit.punchline}</p>}
              {i === index && it.bit?.tag_lines.map((t, n) => <p key={n} className="mt-1 px-2 text-lg text-dim">+ {t}</p>)}
            </li>
          ))}
        </ol>
      </div>
      <p className="px-5 py-2 text-center text-sm text-faint">Bit {items.length ? index + 1 : 0} of {items.length}. Tap right for next, left for back.</p>
    </div>
  )
}
