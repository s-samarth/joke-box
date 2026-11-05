/**
 * List, Map or Web: three ways to see the same jokes, filters and all. Map and Web take the whole
 * screen, so they're never squeezed in beside the list. Where the column is narrow (a joke open
 * beside it), the switch shows icons, named on hover.
 */
import { List, Network, Workflow, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import type { JokeView } from './map/savedView'

const VIEWS: { key: JokeView | 'list'; to: string; label: string; hint: string; icon: LucideIcon }[] = [
  { key: 'list', to: '/jokes', label: 'List', hint: 'Your jokes as a list', icon: List },
  { key: 'map', to: '/jokes/map', label: 'Map', hint: 'Joke map: chains of jokes, left to right', icon: Workflow },
  { key: 'web', to: '/jokes/web', label: 'Web', hint: 'Premise web: each premise among its jokes', icon: Network },
]

export function ViewSwitch({ current, query, compact = false }: { current: JokeView | 'list'; query: string; compact?: boolean }) {
  return (
    <nav aria-label="See jokes as" className="flex rounded-lg bg-ink-3 p-0.5 text-sm">
      {VIEWS.map(({ key, to, label, hint, icon: Icon }) => (
        <Link key={key} to={`${to}${query ? `?${query}` : ''}`} viewTransition aria-current={current === key ? 'page' : undefined}
          aria-label={compact ? label : undefined} title={hint}
          className={`inline-flex h-8 items-center justify-center rounded-md transition-colors ${compact ? 'w-9' : 'px-3'} ${current === key ? 'bg-ink-4 text-paper' : 'text-dim hover:text-paper'}`}>
          {compact ? <Icon size={16} /> : label}
        </Link>
      ))}
    </nav>
  )
}
