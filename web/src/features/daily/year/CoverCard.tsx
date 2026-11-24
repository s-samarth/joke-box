/**
 * The year's first card, the most dressed up of the eight: the year as a spray tag (wall), in
 * shaded block letters with a stamp (flyer) or on a letterboard under a neon "Now showing"
 * (marquee); the pieces written, split three ways; and the year's best bits along the bottom, as
 * stickers, a flyer's tear-off tabs or lit boxes. Between them, the year month by month, each
 * month's bar split by kind.
 */
import { KIND_META, KINDS } from '../activity'
import { Display, Drips, Eyebrow, KindBars, Letterboard, Stamp } from './StoryKit'
import { dayMonth, n, PLURAL_PART } from './storyFormat'
import type { Theme } from './themes'
import type { YearStats } from './yearStats'

const STICKERS = ['bg-tape text-tape-ink -rotate-3', 'bg-paper text-ink rotate-2', 'bg-light text-white -rotate-2', 'bg-orchid text-[#3a1638] rotate-1', 'bg-sky text-[#16224a] -rotate-1']
const KIND_FILL = { observations: 'bg-orchid text-[#3a1638]', premises: 'bg-sky text-[#16224a]', jokes: 'bg-ok text-[#0f2a1f]' }

/** The year's best bits, short enough for a sticker or a tear-off tab. */
function bits(s: YearStats): string[] {
  const diff = s.lastYearTotal === null ? null : s.total - s.lastYearTotal
  return [
    s.streak && s.streak.length > 1 ? `${s.streak.length}-day streak` : null,
    s.biggest ? `${s.biggest.total} on ${dayMonth(s.biggest.day)}` : null,
    s.topics[0] ? `Topic: ${s.topics[0].name}` : null,
    s.rhythm ? `${s.rhythm.day.slice(0, -1)} ${PLURAL_PART[s.rhythm.part]}` : null,
    diff !== null ? `${diff >= 0 ? '+' : '−'}${n(Math.abs(diff))} vs ${s.year - 1}` : s.sofar ? `On pace for ${n(Math.round((s.total / s.daysCounted) * s.daysIn))}` : null,
  ].filter((b): b is string => b !== null)
}

function Year({ t, s }: { t: Theme; s: YearStats }) {
  if (t.key === 'wall') {
    return (
      <>
        <Eyebrow t={t}>{s.sofar ? 'so far, still going' : 'that was the year'}</Eyebrow>
        <p className="mt-1 -rotate-6 font-marker text-[68px] leading-none text-tape">{s.year}</p>
        <Drips />
      </>
    )
  }
  if (t.key === 'flyer') {
    return (
      <>
        <p className="mt-6 border-y-2 border-current py-1 text-center font-poster text-[11px] tracking-wide">{s.sofar ? 'Still running · all written by you' : 'One year only · all written by you'}</p>
        <div className="relative">
          <p className="mt-3 text-center font-poster-shade text-[80px]">{s.year}</p>
          <Stamp className="absolute right-0 -bottom-3 -rotate-12 text-[#d8322a]">{s.sofar ? 'So far' : 'Wrapped'}</Stamp>
        </div>
      </>
    )
  }
  return (
    <>
      <p className="neon mt-7 text-center font-poster text-[15px] text-[#ff6b9a]">{s.sofar ? 'Now showing' : 'Last season'}</p>
      <div className="mt-2"><Letterboard lines={['Your', String(s.year)]} size={22} /></div>
    </>
  )
}

function Kinds({ t, s }: { t: Theme; s: YearStats }) {
  if (t.key === 'flyer') {
    return (
      <div className="mt-3">
        <p className="font-poster text-[11px]">Featuring</p>
        <p className="font-poster text-[15px] leading-snug">{KINDS.map((k) => <span key={k} className="block">{n(s.counts[k])} {KIND_META[k].many}</span>)}</p>
      </div>
    )
  }
  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
      {KINDS.map((k, i) => (
        <div key={k} className={`rounded-lg px-1 py-2 ${t.key === 'wall' ? `${KIND_FILL[k]} ${['-rotate-3', 'rotate-2', '-rotate-1'][i]}` : `border-2 ${KIND_META[k].text} border-current`}`}>
          <p className="font-poster text-[20px] tabular">{n(s.counts[k])}</p>
          <p className="mt-0.5 truncate text-[9px] font-bold uppercase">{KIND_META[k].many}</p>
        </div>
      ))}
    </div>
  )
}

function Bits({ t, s }: { t: Theme; s: YearStats }) {
  const list = bits(s)
  if (t.key === 'flyer') {
    return (
      <div className="-mx-5 mt-auto -mb-8 flex border-t-2 border-dashed border-current">
        {list.map((b) => <span key={b} className="flex h-24 flex-1 items-center justify-center border-r-2 border-dashed border-current font-poster text-[10px] [writing-mode:vertical-rl] last:border-r-0 rotate-180">{b}</span>)}
      </div>
    )
  }
  return (
    <div className="mt-auto flex flex-wrap gap-1.5">
      {list.map((b, i) => <span key={b} className={`rounded px-2 py-1.5 font-poster text-[11px] ${t.key === 'wall' ? STICKERS[i % STICKERS.length] : 'border-2 border-[#ffd66b] text-[#ffd66b]'}`}>{b}</span>)}
    </div>
  )
}

export function CoverCard({ t, s }: { t: Theme; s: YearStats }) {
  return (
    <>
      <Year t={t} s={s} />
      <Display t={t} className={`mt-4 text-[54px] tabular ${t.key === 'marquee' ? 'text-center' : ''}`}>{n(s.total)}</Display>
      <p className={`mt-1 ${t.key === 'wall' ? 'font-marker text-[17px] text-tape' : 'font-poster text-[12px]'} ${t.key === 'marquee' ? 'text-center' : ''}`}>pieces written</p>
      <Kinds t={t} s={s} />
      <div className="mt-4 mb-4 flex min-h-0 flex-1 flex-col"><KindBars months={s.months} /></div>
      <Bits t={t} s={s} />
    </>
  )
}
