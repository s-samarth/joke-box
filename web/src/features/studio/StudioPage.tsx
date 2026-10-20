/** Creative Studio: pick a bit, then write timed brainstorms with saved versions. */
import { ArrowLeft, History, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useBits } from '../../api/library'
import { useBrainstorms } from '../../api/shows'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/bits'
import { BitPicker } from './BitPicker'
import { BrainstormEditor } from './BrainstormEditor'

export function StudioPage() {
  const { bitId } = useParams()
  const { data: bits = [] } = useBits()
  const { data: brainstorms = [] } = useBrainstorms()
  const [historyOpen, setHistoryOpen] = useState(false)
  const bit = bits.find((b) => b.id === bitId)
  const forBit = brainstorms.filter((b) => b.bit_id === bitId)

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 pt-5 sm:px-6 lg:pt-8">
      <aside className={`w-full shrink-0 lg:block lg:w-72 ${bit ? 'hidden' : ''}`}>
        <h1 className="mb-4 font-display text-3xl font-bold tracking-tight lg:text-2xl">Creative Studio</h1>
        <BitPicker activeId={bitId} />
      </aside>

      <div className={`min-w-0 flex-1 ${bit ? '' : 'hidden lg:block'}`}>
        {bit ? (
          <>
            <div className="mb-3 flex items-center justify-between lg:hidden">
              <Link to="/studio" className="inline-flex h-10 items-center gap-1.5 text-sm text-muted"><ArrowLeft size={18} /> All bits</Link>
              <Button size="sm" icon={<History size={16} />} onClick={() => setHistoryOpen(true)}>History</Button>
            </div>
            <BrainstormEditor
              key={bit.id}
              bit={bit}
              brainstorms={forBit}
              historyOpen={historyOpen}
              onCloseHistory={() => setHistoryOpen(false)}
            />
          </>
        ) : (
          <EmptyState icon={<Sparkles size={24} />} title="Select a bit to brainstorm">
            Pick a bit on the left. Start the timer, write freely, and every save keeps a version.
          </EmptyState>
        )}
      </div>
    </div>
  )
}
