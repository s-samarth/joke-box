/**
 * The year on stage (its shows as tally marks, how you rated them, the busiest month and the
 * longest set) and the last card: how far the year's ideas got, from notebook to stage.
 */
import { plural, stageTotal } from '../../shows/calendar/showMonth'
import { longMonth } from '../highlights/measures'
import { stars, WELL } from '../highlights/ratings'
import { Display, Eyebrow, StatBox, TallyRows } from './StoryKit'
import { minSec, n } from './storyFormat'
import { tint, type Theme } from './themes'
import type { YearStats } from './yearStats'

export function StageCard({ t, s }: { t: Theme; s: YearStats }) {
  const st = s.stage
  if (!st) return null
  return (
    <>
      {t.key === 'marquee'
        ? <p className="neon mt-7 rounded-xl border-[3px] border-current py-1.5 text-center font-poster text-[26px] text-[#ff6b9a] shadow-[0_0_14px_#ff6b9a88]">On stage</p>
        : <Eyebrow t={t}>{s.sofar ? 'On stage so far' : 'On stage'}</Eyebrow>}
      <Display t={t} className={`text-[48px] ${t.key === 'marquee' ? 'text-center' : ''}`}>{stageTotal(st.seconds)}</Display>
      <p className={`mt-1 text-[15px] font-semibold ${t.key === 'marquee' ? 'text-center' : ''}`}>{plural(st.shows, 'show')} on {plural(st.nights, 'night')}</p>
      <div className="mt-4 flex min-h-0 flex-1 items-center overflow-hidden"><TallyRows count={st.shows} /></div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <StatBox t={t} value={st.well} label={`well-rated, ${WELL}★ and up`} />
        <StatBox t={t} value={st.atTop} label={`at your top, ${stars(st.top)}`} />
        {st.busiest && <StatBox t={t} value={`${longMonth(st.busiest.month).slice(0, 3)} · ${st.busiest.shows}`} label="busiest month" />}
        <StatBox t={t} value={minSec(st.longest)} label="longest set" />
      </div>
    </>
  )
}

function Step({ t, done, of, what, tone, bar }: { t: Theme; done: number; of: number; what: string; tone: string; bar: string }) {
  return (
    <div className={`${t.box} px-3 py-2.5`}>
      <p className="flex items-baseline gap-2"><span className={`font-poster text-[30px] tabular ${tone}`}>{n(done)}</span><span className="text-[13px] font-semibold">of {n(of)}</span></p>
      <p className="mt-0.5 text-[12px] font-semibold uppercase">{what}</p>
      <span className="mt-2 block h-2 overflow-hidden rounded-full bg-current/15"><span className={`block h-full rounded-full ${bar}`} style={{ width: `${of ? (done / of) * 100 : 0}%` }} /></span>
    </div>
  )
}

export function ThroughCard({ t, s }: { t: Theme; s: YearStats }) {
  const x = s.through
  return (
    <>
      <Eyebrow t={t}>From notebook to stage</Eyebrow>
      <Display t={t} className="text-[34px] leading-[0.95]">How far the ideas got</Display>
      <div className="mt-4 flex flex-1 flex-col justify-center gap-2">
        <Step t={t} done={x.led} of={x.observations} what="observations led somewhere" tone={tint(t, 'text-orchid')} bar="bg-orchid" />
        <Step t={t} done={x.built} of={x.premises} what="premises got a joke" tone={tint(t, 'text-sky')} bar="bg-sky" />
        <Step t={t} done={x.ready} of={x.jokes} what="jokes marked Stage Ready" tone={tint(t, 'text-ok')} bar="bg-ok" />
      </div>
      <p className={`mt-4 font-poster text-[14px] ${t.accent}`}>{s.sofar ? `${s.daysIn - s.daysCounted} days of ${s.year} to go` : `That was ${s.year}. See you on stage.`}</p>
    </>
  )
}
