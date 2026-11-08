/** Daily activity on Home, under the shortcuts: the streaks, the month, the calendar and the day you tap. */
import { Link } from 'react-router'
import { SectionHead } from '../../components/ui/pieces'
import { ActivityPanel } from '../daily/ActivityPanel'

export function TodayActivity() {
  return (
    <section className="mt-12">
      <SectionHead title="Daily activity">
        <Link to="/daily" className="text-sm text-dim hover:text-paper">Open</Link>
      </SectionHead>
      <ActivityPanel lists={false} />
    </section>
  )
}
