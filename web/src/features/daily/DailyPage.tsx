/**
 * Daily activity: everything you wrote, day by day. The joke nudge and today's joke box stay on
 * top (only jokes keep the streak), then the streaks, the month's total split by kind, and a
 * calendar where every day shows how much you wrote and of which kind (see ActivityPanel, which
 * Home shows too). Tap a day to see its counts and the pieces themselves.
 */
import { PageHead } from '../../components/ui/pieces'
import { QuickCapture } from '../today/QuickCapture'
import { ActivityPanel } from './ActivityPanel'
import { DailyBanner } from './DailyBanner'
import { useHabit } from './useHabit'

const focusBox = () => document.getElementById('quick-capture')?.focus()

export function DailyPage() {
  const { habit } = useHabit()
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHead title="Daily activity" />
      <DailyBanner habit={habit} onWrite={focusBox} />

      <div>
        <h2 className="mb-2 text-sm text-dim">{habit.gap === 0 ? 'Another one? Go on.' : "Today's joke"}</h2>
        <QuickCapture />
      </div>

      <ActivityPanel lists />
    </div>
  )
}
