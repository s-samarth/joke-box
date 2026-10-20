/** External links: your own comedy sites, a tap away. */
import { ExternalLink } from 'lucide-react'
import { PageHead } from '../../components/ui/bits'

const LINKS = [
  {
    name: 'The Relatable Schemer',
    what: 'Your comedy persona: blueprint, persona deep dive, jokes rolling, theory and strategy.',
    url: 'https://standup-samarth.lovable.app/',
  },
  {
    name: 'Comedy Atlas',
    what: 'The technical evolution of Indian stand-up: lexicon, BVT, incongruity-resolution, LPM.',
    url: 'https://comedyatlas.lovable.app/',
  },
]

export function LinksPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="External links" />
      <ul className="space-y-3">
        {LINKS.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-4 rounded-xl bg-ink-2 p-4 ring-1 ring-rule transition-colors hover:bg-ink-3">
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-medium">{l.name}</span>
                <span className="mt-0.5 block text-sm text-dim">{l.what}</span>
                <span className="mt-1.5 block truncate text-sm text-tape">{l.url.replace(/^https:\/\//, '').replace(/\/$/, '')}</span>
              </span>
              <ExternalLink size={18} className="mt-1 shrink-0 text-faint" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
