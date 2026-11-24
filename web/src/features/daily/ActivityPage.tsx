/**
 * Activity: how the writing and the stage are going, with nothing to write here (that's Home's
 * job). From the top: all-time counts (LifetimeStats), the streak cards and the calendar card with the day you tapped
 * (ActivityPanel, which Home shows too), the writing pulse (WritingPulse), highlights, your best
 * months and days (Highlights), and the year so far or a past year wrapped (YearReview).
 */
import { PageHead } from '../../components/ui/pieces'
import { ActivityPanel } from './ActivityPanel'
import { LifetimeStats } from './highlights/LifetimeStats'
import { Highlights } from './highlights/Highlights'
import { WritingPulse } from './WritingPulse'
import { YearReview } from './year/YearReview'

export function ActivityPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10 pb-10">
      <div>
        <PageHead title="Activity" />
        <div className="mb-5"><LifetimeStats /></div>
        <ActivityPanel />
      </div>
      <WritingPulse />
      <Highlights />
      <YearReview />
    </div>
  )
}
