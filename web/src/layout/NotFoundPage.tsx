/**
 * An address that isn't a JokeBox page: an old link, or a mistyped one. It used to show Home
 * without a word, which looked like the link had worked. This says so and offers the way back.
 */
import { Link, useLocation } from 'react-router'
import { EmptyState } from '../components/ui/pieces'

export function NotFoundPage() {
  const { pathname } = useLocation()
  return (
    <div className="mx-auto max-w-2xl">
      <EmptyState
        title="Nothing at this address"
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/" className="inline-flex h-11 items-center rounded-lg bg-tape px-5 font-semibold text-tape-ink hover:bg-[#f5da77]">Go to Home</Link>
            <Link to="/search" className="inline-flex h-11 items-center rounded-lg px-5 text-dim hover:bg-ink-3 hover:text-paper">Search</Link>
          </div>
        }
      >
        <span className="break-all text-paper">{pathname}</span> isn’t a page in JokeBox. The link may be old or mistyped. Everything you’ve written is where you left it.
      </EmptyState>
    </div>
  )
}
