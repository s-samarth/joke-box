/** Today's observation box: log what you noticed. The observations themselves live under Ideas. */
import { Link } from 'react-router'
import { useObservations } from '../../api/notebook'
import { SectionHead } from '../../components/ui/pieces'
import { ObservationBox } from '../observations/ObservationBox'

export function TodayObservations() {
  const { data: observations = [] } = useObservations()
  return (
    <section className="mt-12">
      <SectionHead title="Observations">
        <Link to="/observations" className="text-sm text-dim hover:text-paper">{observations.length ? `All ${observations.length}` : 'Open'}</Link>
      </SectionHead>
      <ObservationBox />
    </section>
  )
}
