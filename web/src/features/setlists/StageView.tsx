/**
 * For use on stage: big text, the current bit highlighted, a running set timer against the
 * target, and the screen kept awake. Tap the right side for the next bit, the left to go back.
 */
import { Pause, Play, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useBits } from '../../api/library'
import { useSetlists } from '../../api/shows'
import { clock } from '../../lib/duration'
import { useTimer } from '../studio/useTimer'

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    const request = () => navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => undefined)
    void request()
    const onVisible = () => document.visibilityState === 'visible' && void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [active])
}

export function StageView() {
  const { setlistId } = useParams()
  const { data: setlists = [] } = useSetlists()
  const { data: bits = [] } = useBits()
  const [index, setIndex] = useState(0)
  const timer = useTimer()
  useWakeLock(true)
  const setlist = setlists.find((s) => s.id === setlistId)
  if (!setlist) return <div className="p-8 text-muted">Setlist not found. <Link to="/setlist" className="text-accent">Back</Link></div>

  const items = setlist.items.map((i) => ({ ...i, bit: bits.find((b) => b.id === i.bit_id) }))
  const current = items[index]
  const over = timer.seconds > setlist.target_seconds
  const go = (delta: number) => setIndex((i) => Math.min(Math.max(i + delta, 0), items.length - 1))

  return (
    <div className="pt-safe pb-safe fixed inset-0 flex flex-col bg-black text-white select-none">
      <header className="flex items-center justify-between gap-4 px-4 py-3">
        <Link to={`/setlist/${setlist.id}`} aria-label="Exit stage view" className="inline-flex size-11 items-center justify-center rounded-xl text-white/60"><X size={24} /></Link>
        <button type="button" onClick={timer.running ? timer.pause : timer.start} className={`inline-flex items-center gap-2 font-display text-3xl tabular ${over ? 'text-warn' : 'text-white'}`}>
          {timer.running ? <Pause size={22} /> : <Play size={22} />}
          {clock(timer.seconds)}<span className="text-lg text-white/40"> / {clock(setlist.target_seconds)}</span>
        </button>
        <span className="w-11 text-right text-sm text-white/50 tabular">{items.length ? index + 1 : 0}/{items.length}</span>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <button type="button" aria-label="Previous bit" className="absolute inset-y-0 left-0 z-10 w-1/3" onClick={() => go(-1)} />
        <button type="button" aria-label="Next bit" className="absolute inset-y-0 right-0 z-10 w-2/3" onClick={() => go(1)} />
        <main className="flex flex-1 flex-col justify-center gap-6 overflow-hidden px-6 sm:px-12">
          {current ? (
            <>
              <p className="font-display text-4xl leading-tight font-semibold sm:text-6xl">{current.bit?.setup ?? 'Deleted bit'}</p>
              {current.bit?.punchline && <p className="text-2xl leading-snug text-accent sm:text-4xl">{current.bit.punchline}</p>}
              {current.bit?.tag_lines.map((t, i) => <p key={i} className="text-xl text-white/60 sm:text-2xl">+ {t}</p>)}
            </>
          ) : (
            <p className="text-2xl text-white/50">This set is empty.</p>
          )}
        </main>
      </div>
      <footer className="space-y-1 border-t border-white/10 px-6 py-3">
        {items.slice(index + 1, index + 3).map((i, n) => (
          <p key={i.bit_id} className="truncate text-lg text-white/40">{n === 0 ? 'Next: ' : ''}{i.bit?.setup}</p>
        ))}
      </footer>
    </div>
  )
}
