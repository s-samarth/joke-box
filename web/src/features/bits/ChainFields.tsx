/**
 * "Follows": the joke this one continues from, picked from your jokes. Many jokes can follow the
 * same one, so "Followed by" can list several, and a chain branches into a tree.
 */
import { Link2, Plus, Search, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useBits } from '../../api/library'
import type { Bit } from '../../api/types'
import { Input } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { laterThan } from '../../lib/chains'
import { matchesSearch } from './useBitFilters'

const chip = 'inline-flex h-10 items-center gap-2 rounded-lg bg-ink-3 px-3 text-[15px] hover:bg-ink-4'

interface Props {
  /** The joke being edited; none while writing a new one. */
  bitId?: string
  value: string | null
  onChange: (id: string | null) => void
}

export function FollowsField({ bitId, value, onChange }: Props) {
  const { data: bits = [] } = useBits()
  const [picking, setPicking] = useState(false)
  const [q, setQ] = useState('')
  const before = bits.find((b) => b.id === value)
  // A joke can't follow itself or anything that already comes after it.
  const later = bitId ? laterThan(bitId, bits) : new Set<string>()
  const shown = bits.filter((b) => !later.has(b.id) && matchesSearch(b, q))
  const pick = (id: string) => {
    onChange(id)
    setPicking(false)
    setQ('')
  }

  return (
    <>
      {value ? (
        <div className="space-y-2">
          {before
            ? <Link to={`/bits/${before.id}`} className="line-clamp-2 rounded-lg bg-ink-3 px-3 py-2.5 leading-snug hover:bg-ink-4">{before.setup}</Link>
            : <p className="text-dim">A joke in the Trash</p>}
          <div className="flex gap-5 text-sm">
            <button type="button" onClick={() => setPicking(true)} className="text-tape hover:underline">Change</button>
            <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 text-dim hover:text-paper"><X size={14} /> Unlink</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setPicking(true)} className={`${chip} text-dim hover:text-paper`}><Link2 size={16} /> Pick the joke before</button>
      )}
      <Modal open={picking} onOpenChange={setPicking} title="Which joke comes before?" description="This one will follow it. Adding this joke to a set brings the jokes before it too.">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
          <Input type="search" aria-label="Search jokes" placeholder="Search jokes" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ul className="mt-3 max-h-[50dvh] divide-y divide-rule overflow-y-auto">
          {shown.length === 0 && <li className="py-6 text-dim">No jokes match.</li>}
          {shown.map((b) => (
            <li key={b.id}>
              <button type="button" onClick={() => pick(b.id)} aria-pressed={b.id === value}
                className={`w-full py-3 text-left leading-snug hover:text-tape ${b.id === value ? 'text-tape' : ''}`}>
                <span className="line-clamp-2">{b.setup}</span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}

/** The jokes that follow this one, as links, and a button to write another. */
export function FollowedBy({ next, onWriteNext }: { next: Bit[]; onWriteNext: () => void }) {
  return (
    <div className="space-y-2">
      {next.length > 0 && (
        <ul className="space-y-2">
          {next.map((b) => (
            <li key={b.id}><Link to={`/bits/${b.id}`} className="line-clamp-2 rounded-lg bg-ink-3 px-3 py-2.5 leading-snug hover:bg-ink-4">{b.setup}</Link></li>
          ))}
        </ul>
      )}
      <button type="button" onClick={onWriteNext} className={`${chip} text-dim hover:text-paper`}><Plus size={16} /> Write the next joke</button>
    </div>
  )
}
