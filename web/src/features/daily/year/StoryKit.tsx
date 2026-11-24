/** The pieces every year card is built from, each dressed by the year's theme (themes.ts). */
import type { ReactNode } from 'react'
import { Tally } from '../Tally'
import type { YearMonth } from './yearStats'
import type { Theme } from './themes'

const KIND_ORDER = ['observations', 'premises', 'jokes'] as const
const KIND_BG = { observations: 'bg-orchid', premises: 'bg-sky', jokes: 'bg-ok' }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function Eyebrow({ t, children }: { t: Theme; children: ReactNode }) {
  return <p className={`mt-6 ${t.eyebrow}`}>{children}</p>
}

/** A big headline: a number, a month, a name. */
export function Display({ t, children, className = '' }: { t: Theme; children: ReactNode; className?: string }) {
  return <p className={`mt-2 break-words ${t.display} ${className}`}>{children}</p>
}

export function StatBox({ t, value, label, className = '' }: { t: Theme; value: ReactNode; label: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 px-2.5 py-2 ${t.box} ${className}`}>
      <p className="font-poster text-[22px] tabular">{value}</p>
      <p className="mt-1 text-[11px] leading-tight font-semibold uppercase">{label}</p>
    </div>
  )
}

/** The year's months as bars, the best one lit, months to come dashed; it fills the room it's given. */
export function MonthBars({ t, months, best }: { t: Theme; months: YearMonth[]; best: string | null }) {
  const max = Math.max(1, ...months.map((m) => m.total))
  return (
    <div className="flex min-h-24 flex-1 flex-col justify-end" aria-hidden>
      <div className="flex h-full max-h-56 items-end gap-1">
        {months.map((m) => (
          <span key={m.month} className={`flex-1 rounded-[3px] ${!m.days ? 'border-2 border-dashed border-current/30' : m.month === best ? t.barTop : t.bar}`}
            style={{ height: m.days ? `${Math.max(4, (m.total / max) * 100)}%` : '20%' }} />
        ))}
      </div>
      <div className="mt-1.5 flex gap-1 text-[10px] font-semibold uppercase">
        {months.map((m) => <span key={m.month} className={`min-w-0 flex-1 text-center ${m.month === best ? '' : 'opacity-60'}`}>{MONTHS[Number(m.month.slice(5)) - 1]}</span>)}
      </div>
    </div>
  )
}

/** The year's months as stacked bars, one colour per kind; it fills the room it's given. */
export function KindBars({ months }: { months: YearMonth[] }) {
  const max = Math.max(1, ...months.map((m) => m.total))
  return (
    <div className="flex min-h-24 flex-1 flex-col justify-end" aria-hidden>
      <div className="flex h-full max-h-60 items-end gap-1">
        {months.map((m) => (
          <span key={m.month} className={`flex flex-1 flex-col-reverse overflow-hidden rounded-[3px] ${m.days ? '' : 'border-2 border-dashed border-current/30'}`} style={{ height: m.days ? `${Math.max(3, (m.total / max) * 100)}%` : '20%' }}>
            {m.days > 0 && KIND_ORDER.map((k) => <span key={k} className={KIND_BG[k]} style={{ flexGrow: m.counts[k] }} />)}
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1 text-[10px] font-semibold uppercase opacity-70">
        {months.map((m) => <span key={m.month} className="min-w-0 flex-1 text-center">{MONTHS[Number(m.month.slice(5)) - 1]}</span>)}
      </div>
    </div>
  )
}
/** Shows as tally marks, six bundles of five to a row across the card's width (up to 120), in the card's own colour. */
export function TallyRows({ count }: { count: number }) {
  const shown = Math.min(count, 120)
  const rows = Array.from({ length: Math.ceil(shown / 30) }, (_, i) => Math.min(30, shown - i * 30))
  return (
    <div className="w-full space-y-3" aria-label={`${count} shows`} role="img">
      {rows.map((n, i) => <Tally key={i} count={n} height={22} max={30} color="text-current" className="h-auto" style={{ width: `${(n / 30) * 100}%` }} />)}
    </div>
  )
}

/** Block letters on a marquee's letterboard, one line per word group. */
export function Letterboard({ lines, size = 15 }: { lines: string[]; size?: number }) {
  return (
    <div className="letterboard font-poster" style={{ fontSize: size }} aria-label={lines.join(' ')} role="img">
      {lines.map((line) => (
        <div key={line} className="flex justify-center gap-[3px]">
          {[...line.toUpperCase()].map((c, i) => (c === ' ' ? <span key={i} className="w-2" /> : <span key={i} className="letterboard-tile">{c}</span>))}
        </div>
      ))}
    </div>
  )
}

/** Spray-paint drips under a tag on the wall. */
export function Drips() {
  return (
    <svg aria-hidden width="150" height="30" viewBox="0 0 150 30" className="-mt-2 ml-2 text-tape">
      <g fill="currentColor">
        <rect x="12" y="0" width="3" height="19" rx="1.5" /><circle cx="13.5" cy="20" r="2.6" />
        <rect x="58" y="0" width="2.5" height="27" rx="1.2" /><circle cx="59.2" cy="27" r="2.3" />
        <rect x="104" y="0" width="3" height="12" rx="1.5" /><circle cx="105.5" cy="13" r="2.5" />
      </g>
    </svg>
  )
}

/** A marker swoosh under a word on the wall. */
export function Underline() {
  return (
    <svg aria-hidden width="170" height="12" viewBox="0 0 170 12" className="text-tape">
      <path d="M2 8 C45 2,95 12,168 4" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** A rubber stamp, tilted. */
export function Stamp({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-block rounded-md border-[3px] border-current px-2 py-1 font-poster text-[13px] ${className}`}>{children}</span>
}
