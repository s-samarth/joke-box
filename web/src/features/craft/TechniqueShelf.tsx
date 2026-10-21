/** Your techniques as a shelf of cards you can start straight away, each opening a brainstorm. */
import { Sparkles } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { newId } from '../../api/client'
import type { CraftArea, CraftNote } from '../../api/types'
import { prompts } from './bodyFormat'
import { AREA_COLORS } from './craftMeta'

export function TechniqueShelf({ notes, areas }: { notes: CraftNote[]; areas: CraftArea[] }) {
  const navigate = useNavigate()
  const techniques = notes.filter((n) => n.kind === 'technique')
  if (!techniques.length) return null
  return (
    <section className="mt-10">
      <h2 className="headline text-2xl">Write with a technique</h2>
      <p className="mt-0.5 text-sm text-dim">Each opens a brainstorm with its prompts on screen.</p>
      <ul className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {techniques.map((t) => {
          const color = AREA_COLORS[areas.find((a) => a.id === t.area_id)?.color ?? 'violet']
          const count = prompts(t.body).length
          return (
            <li key={t.id} className="w-44 shrink-0 snap-start">
              <button type="button" onClick={() => navigate(`/brainstorm/${newId()}?technique=${t.id}`)} style={{ '--area': color } as CSSProperties}
                className="flex h-full w-full flex-col rounded-xl bg-ink-2 p-3.5 text-left ring-1 ring-rule transition-colors hover:bg-ink-3 hover:ring-[var(--area)]">
                <Sparkles size={18} className="text-[var(--area)]" aria-hidden />
                <span className="mt-2 leading-snug font-medium">{t.title}</span>
                <span className="mt-auto pt-3 text-xs text-faint">{count ? `${count} prompts` : 'Open it'}, start writing</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
