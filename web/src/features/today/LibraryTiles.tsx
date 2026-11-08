/**
 * Three shortcuts under the joke box on Home: Jokes, Premises and Observations, each with how many
 * you have, in the colours they wear on Daily activity. One tap into any of the three, on any screen size.
 */
import { Link } from 'react-router'
import { useJokes } from '../../api/library'
import { useObservations } from '../../api/notebook'
import { usePremises } from '../../api/premises'
import { KIND_META, KINDS, type Kind } from '../daily/activity'

const TO: Record<Kind, string> = { jokes: '/jokes', premises: '/premises', observations: '/observations' }
const label = (k: Kind) => KIND_META[k].many[0].toUpperCase() + KIND_META[k].many.slice(1)

export function LibraryTiles() {
  const counts: Record<Kind, number | undefined> = {
    jokes: useJokes().data?.length,
    premises: usePremises().data?.length,
    observations: useObservations().data?.length,
  }
  return (
    <nav aria-label="Your material" className="mt-6 grid grid-cols-3 gap-2">
      {KINDS.map((k) => (
        <Link key={k} to={TO[k]} className="min-w-0 rounded-xl bg-ink-2 px-2.5 py-2.5 min-[360px]:px-3 ring-1 ring-rule transition hover:bg-ink-3 active:bg-ink-3">
          <span className="block truncate text-xs text-dim min-[360px]:text-[13px]">{label(k)}</span>
          <span className="mt-1 flex items-center gap-2">
            <span className={`size-2 shrink-0 rounded-full ${KIND_META[k].dot}`} />
            <span className="headline text-[26px] tabular">{counts[k] ?? '·'}</span>
          </span>
        </Link>
      ))}
    </nav>
  )
}
