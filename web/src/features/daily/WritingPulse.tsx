/**
 * Writing pulse on Activity: how the writing is going, read from what's already saved (see
 * pulse.ts), so there is nothing to fill in. The narrowest step said plainly, where everything
 * stands, how far ideas got, month on month, when you write and what's sitting idle.
 */
import { useJokes, useStatuses, useTopics } from '../../api/library'
import { useObservations } from '../../api/notebook'
import { usePremises } from '../../api/premises'
import { isDefaultStatus, topicName } from '../../lib/jokeMeta'
import { useToday } from '../../lib/useToday'
import { useUses } from '../observations/useUsed'
import { pulse } from './pulse'
import { IdleCard } from './pulseCards/IdleCard'
import { MonthOnMonth } from './pulseCards/MonthOnMonth'
import { PulseHeadline } from './pulseCards/PulseHeadline'
import { RhythmCard } from './pulseCards/RhythmCard'
import { StandingCard } from './pulseCards/StandingCard'
import { StepsCard } from './pulseCards/StepsCard'

export function WritingPulse() {
  const { data: jokes } = useJokes()
  const { data: premises } = usePremises()
  const { data: observations } = useObservations()
  const { data: topics = [] } = useTopics()
  const { data: statuses = [] } = useStatuses()
  const uses = useUses()
  const today = useToday()
  const statusOrder = ['Draft', ...statuses.map((s) => s.name).filter((s) => !isDefaultStatus(s))]
  const p = pulse({
    jokes: jokes ?? [], premises: premises ?? [], observations: observations ?? [], used: uses.used,
    topicName: (id) => topicName(topics.find((t) => t.id === id)) || 'Random', statusOrder, today,
  })
  const wider = p.steps.filter((s) => s.of >= 5).length > 1

  return (
    <section aria-labelledby="pulse-title" className="@container space-y-3">
      <div className="mb-4">
        <h2 id="pulse-title" className="headline text-[30px]">Writing pulse</h2>
        <p className="mt-1 text-sm text-dim">Worked out from what you’ve written. Nothing to log.</p>
      </div>
      {p.thin ? (
        <p className="text-dim">Write a few more observations, premises or jokes and this fills in.</p>
      ) : (
        <>
          <PulseHeadline narrowest={p.narrowest} notes={p.notes} wider={wider} />
          <StandingCard standing={p.standing} />
          <StepsCard steps={p.steps} narrowest={p.narrowest} />
          <MonthOnMonth months={p.months} />
          <div className="grid gap-3 @lg:grid-cols-2">
            {p.rhythm && <RhythmCard rhythm={p.rhythm} />}
            <IdleCard idle={p.idle} />
          </div>
        </>
      )}
    </section>
  )
}
