/** The year review's bigger cards and the headline every card leads with. */
import type { ReactNode } from 'react'
import { plural } from '../../shows/calendar/showMonth'
import { KIND_META, KINDS } from '../activity'
import { longMonth } from '../highlights/measures'
import { dayMonth, n } from './storyFormat'
import type { YearStats } from './yearStats'

export function Lead({ over, big, className = '', children }: { over: string; big: string; className?: string; children?: ReactNode }) {
  return (
    <div className="mt-8">
      <p className="text-[15px] opacity-75">{over}</p>
      <p className={`headline mt-1.5 text-[52px] leading-[0.95] break-words sm:text-[58px] ${className}`}>{big}</p>
      {children && <div className="mt-3 text-[16px] leading-snug">{children}</div>}
    </div>
  )
}

export function Cover({ s }: { s: YearStats }) {
  const diff = s.lastYearTotal === null ? null : s.total - s.lastYearTotal
  const pace = Math.round((s.total / s.daysCounted) * s.daysIn)
  return (
    <>
      <p className="mt-10"><span className="tape inline-block px-4 py-1.5 text-[24px]" style={{ '--tilt': '-3deg' } as React.CSSProperties}>{s.sofar ? `${s.year} so far` : `Your ${s.year}`}</span></p>
      <p className="mt-3 text-sm opacity-75">{s.sofar ? `1 Jan to ${dayMonth(s.to)}` : 'January to December'}</p>
      <div className="mt-auto">
        <p className="headline text-[72px] leading-none tabular">{n(s.total)}</p>
        <p className="mt-1 text-[17px]">pieces written</p>
        <div className="mt-3 flex h-2 gap-1 overflow-hidden rounded-full">{KINDS.filter((k) => s.counts[k]).map((k) => <span key={k} className={KIND_META[k].dot} style={{ flexGrow: s.counts[k] }} />)}</div>
        <p className="mt-2 text-sm leading-relaxed opacity-75">{KINDS.map((k) => `${n(s.counts[k])} ${s.counts[k] === 1 ? KIND_META[k].one : KIND_META[k].many}`).join(' · ')}</p>
        {diff !== null && <p className={`mt-3 text-[15px] ${diff >= 0 ? 'text-ok' : 'text-dim'}`}>{diff >= 0 ? `${n(diff)} more than all of ${s.year - 1}` : `${n(-diff)} fewer than ${s.year - 1}`}</p>}
        {s.sofar && <p className="mt-1 text-sm opacity-75">On pace for about {n(pace)} by 31 December.</p>}
      </div>
    </>
  )
}

export function BestMonth({ s }: { s: YearStats }) {
  const best = s.best
  if (!best) return null
  const max = Math.max(...s.months.map((m) => m.total), 1)
  return (
    <>
      <Lead over={s.sofar ? 'Your best month so far' : 'Your best month'} big={longMonth(best.month)} className="text-ok">
        {plural(best.total, 'piece')}, {plural(best.jokes, 'joke')} among them. You wrote on {best.daysWritten} of its {best.days} days.
      </Lead>
      <div className="mt-auto flex h-24 items-end gap-1" aria-hidden>
        {s.months.map((m) => <span key={m.month} className={`flex-1 rounded-[2px] ${m.month === best.month ? 'bg-ok' : m.days ? 'bg-ink-4' : 'border border-dashed border-ink-4'}`} style={{ height: m.days ? `${Math.max(3, (m.total / max) * 100)}%` : '25%' }} />)}
      </div>
      <div className="mt-1 flex gap-1 text-[11px] opacity-60" aria-hidden>{s.months.map((m) => <span key={m.month} className="min-w-0 flex-1 text-center">{longMonth(m.month).slice(0, 3)}</span>)}</div>
    </>
  )
}
