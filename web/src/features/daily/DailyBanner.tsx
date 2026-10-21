/**
 * The daily joke nudge, first thing on Home. It changes with how long it's been since your last
 * joke: a small green line once today's is written, yellow while today is still open, red after
 * three days, and after a week it goes dark and spooky.
 */
import { ChevronRight, CircleCheck, Ghost, PenLine } from 'lucide-react'
import { Link } from 'react-router'
import type { Habit } from './dailyMath'

const streak = (n: number) => `${n}-day streak`

/** A cobweb strung across the top-right corner: four threads out from the corner, three sagging rings. */
function Cobweb() {
  const threads = [0, 30, 60, 90].map((deg) => [Math.cos((deg * Math.PI) / 180) * 110, Math.sin((deg * Math.PI) / 180) * 110])
  const ring = (r: number) => threads.map(([x, y], i) => `${i ? 'Q' : 'M'}${i ? `${(threads[i - 1][0] + x) * r * 0.42},${(threads[i - 1][1] + y) * r * 0.42} ` : ''}${x * r},${y * r}`).join(' ')
  return (
    <svg aria-hidden viewBox="0 0 110 110" className="pointer-events-none absolute -top-px -right-px size-28 -scale-x-100 text-paper/25">
      <g fill="none" stroke="currentColor" strokeWidth="0.8">
        {threads.map(([x, y]) => <line key={x} x1="0" y1="0" x2={x} y2={y} />)}
        {[0.35, 0.6, 0.85].map((r) => <path key={r} d={ring(r)} />)}
      </g>
    </svg>
  )
}

/** The call to action: a link to the Daily joke page, or (on that page) a button that focuses the box. */
function Write({ onWrite, className, children }: { onWrite?: () => void; className: string; children: React.ReactNode }) {
  const cls = `inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${className}`
  return onWrite
    ? <button type="button" onClick={onWrite} className={cls}>{children}</button>
    : <Link to="/daily" className={cls}>{children}</Link>
}

export function DailyBanner({ habit, onWrite }: { habit: Habit; onWrite?: () => void }) {
  const { gap, current, mood } = habit

  if (mood === 'done') {
    const body = (
      <>
        <CircleCheck size={20} className="shrink-0 text-ok" />
        <span className="min-w-0 flex-1 text-[15px]">Today's joke is written.</span>
        {current > 1 && <span className="text-sm text-ok">{streak(current)}</span>}
        {!onWrite && <ChevronRight size={16} className="text-dim" />}
      </>
    )
    const cls = 'flex items-center gap-3 rounded-xl bg-ok/10 px-4 py-3 ring-1 ring-ok/30'
    return onWrite ? <div className={cls}>{body}</div> : <Link to="/daily" className={`${cls} hover:bg-ok/15`}>{body}</Link>
  }

  if (mood === 'due') {
    const line = gap === null ? 'Start the habit: one new joke a day, any size.'
      : gap === 1 ? (current > 1 ? `Yesterday's done. Keep your ${streak(current)} going.` : "Yesterday's done. Make it two in a row.")
        : "It's been 2 days. One premise gets you back on."
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-xl bg-tape px-5 py-4 text-tape-ink">
        <div className="min-w-0 flex-1">
          <p className="headline text-[30px]">Write a joke today</p>
          <p className="mt-1 text-[15px] opacity-80">{line}</p>
        </div>
        <Write onWrite={onWrite} className="bg-tape-ink text-tape hover:opacity-90"><PenLine size={16} />Write it</Write>
      </div>
    )
  }

  if (mood === 'slipping') {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-xl bg-light/15 px-5 py-4 ring-1 ring-light/50">
        <div className="min-w-0 flex-1">
          <p className="headline text-[30px] text-light">{gap} days without a joke</p>
          <p className="mt-1 text-[15px] text-paper/90">The habit's slipping. Write one today, even a bad one.</p>
        </div>
        <Write onWrite={onWrite} className="bg-light text-ink hover:opacity-90"><PenLine size={16} />Write one now</Write>
      </div>
    )
  }

  // Over a week: the lights go out.
  return (
    <div className="relative flex flex-wrap items-center gap-5 overflow-hidden rounded-xl bg-[#040507] px-5 py-7 ring-1 ring-[#2c2640]">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_90%_at_80%_0%,rgba(122,98,214,0.28),transparent_60%),radial-gradient(80%_80%_at_0%_100%,rgba(95,180,140,0.16),transparent_60%)]" />
      <Cobweb />
      <Ghost size={52} aria-hidden className="ghost-float relative shrink-0 text-paper/75 drop-shadow-[0_0_12px_rgba(180,170,255,0.35)]" />
      <div className="relative min-w-0 flex-1">
        <p className="spooky-flicker font-marker text-[30px] leading-tight text-paper/90">You've stopped writing jokes.</p>
        <p className="mt-1 text-[15px] text-dim">{gap} days of silence. Even a bad premise breaks the spell.</p>
      </div>
      <Write onWrite={onWrite} className="relative border border-paper/30 text-paper hover:bg-paper/10"><PenLine size={16} />Break the silence</Write>
    </div>
  )
}
