/** Activity on Home, under the shortcuts: the joke and stage streak cards, the calendar card and the day you tap. */
import { Link } from 'react-router'
import { SectionHead } from '../../components/ui/pieces'
import { ActivityPanel } from '../daily/ActivityPanel'

export function TodayActivity() {
  return (
    <section className="mt-12">
      <SectionHead title="Activity">
        <Link to="/activity" className="text-sm text-dim hover:text-paper">Open</Link>
      </SectionHead>
      <ActivityPanel />
    </section>
  )
}
