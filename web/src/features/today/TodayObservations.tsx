/** Today's observation log: a box for what you noticed, and the last few you logged. */
import { Link } from 'react-router'
import { useObservations } from '../../api/notebook'
import { SectionHead } from '../../components/ui/pieces'
import { formatDate } from '../../lib/time'
import { ObservationBox } from '../observations/ObservationBox'

const RECENT = 3

export function TodayObservations() {
  const { data: observations = [] } = useObservations()
  const recent = [...observations].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, RECENT)
  return (
    <section className="mt-12">
      <SectionHead title="Observations">
        <Link to="/observations" className="text-sm text-dim hover:text-paper">{observations.length ? `All ${observations.length}` : 'Open'}</Link>
      </SectionHead>
      <ObservationBox />
      {recent.length > 0 && (
        <ul className="mt-3 divide-y divide-rule border-y border-rule">
          {recent.map((o) => (
            <li key={o.id}>
              <Link to={`/observations/${o.id}`} className="block py-3 leading-relaxed hover:text-tape">
                <span className="line-clamp-2">{o.text}</span>
                <span className="mt-1 block text-sm text-faint">{formatDate(o.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
