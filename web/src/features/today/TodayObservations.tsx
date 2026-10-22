/** Today's observation log: a box for what you noticed, and the last few you logged. */
import { Link } from 'react-router'
import { useObservations } from '../../api/notebook'
import { SectionHead } from '../../components/ui/pieces'
import { ObservationBox } from '../observations/ObservationBox'
import { ObservationList } from '../observations/ObservationList'

const RECENT = 3

export function TodayObservations() {
  const { data: observations = [] } = useObservations()
  return (
    <section className="mt-12">
      <SectionHead title="Observations">
        <Link to="/observations" className="text-sm text-dim hover:text-paper">{observations.length ? `All ${observations.length}` : 'Open'}</Link>
      </SectionHead>
      <ObservationBox />
      {observations.length > 0 && <div className="mt-3"><ObservationList observations={observations.slice(0, RECENT)} /></div>}
    </section>
  )
}
