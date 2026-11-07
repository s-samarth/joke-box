/**
 * The Observations button for a premise or joke page, and where its panel shows: beside the item
 * from 1024px (taking the list's place in the SplitView), a sheet below that. It stays open as you
 * move to another item on a wide screen; on a phone each use closes it, since it covers the page.
 */
import { Eye, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useObservations } from '../../api/notebook'
import type { Observation } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useSplitSide } from '../../components/ui/splitSide'
import { useMedia } from '../../layout/useRail'
import { ObservationsPanel, type PanelActions } from './ObservationsPanel'

interface Props extends PanelActions {
  topicId: string
}

/** Opens and closes the panel, inside a SplitView or on its own. */
function useOpen() {
  const side = useSplitSide()
  const [own, setOwn] = useState(false)
  return side ? ([side.open, side.setOpen] as const) : ([own, setOwn] as const)
}

export function ObservationsButton({ topicId }: { topicId: string }) {
  const [open, setOpen] = useOpen()
  const { data: observations = [] } = useObservations()
  const count = observations.filter((o) => o.topic_id === topicId).length
  return (
    <button type="button" aria-pressed={open} aria-label={count ? `Observations on this topic, ${count}` : 'Observations on this topic'} onClick={() => setOpen(!open)}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors ${open ? 'bg-ink-3 text-paper' : 'text-dim hover:bg-ink-3 hover:text-paper'}`}>
      <Eye size={15} /> Observations{count > 0 && <span className="text-faint tabular">{count}</span>}
    </button>
  )
}

export function ObservationsSide({ topicId, addLabel, addedLabel, isAdded, onAdd, onWrite }: Props) {
  const [open, setOpen] = useOpen()
  const side = useSplitSide()
  const wide = useMedia('(min-width: 1024px)')
  if (!open) return null
  // The panel follows the item's topic: keyed on it, a change of topic starts it afresh.
  const panel = (afterUse: () => void) => (
    <ObservationsPanel key={topicId} topicId={topicId} addLabel={addLabel} addedLabel={addedLabel} isAdded={isAdded}
      onAdd={(o: Observation) => { onAdd(o); afterUse() }} onWrite={(o: Observation) => { onWrite(o); afterUse() }} />
  )
  if (wide && side?.slot) {
    return createPortal(
      <div className="px-5 pt-6 pb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="headline text-2xl">Observations</h2>
          <IconButton label="Close observations" onClick={() => setOpen(false)}><X size={18} /></IconButton>
        </div>
        {panel(() => undefined)}
      </div>,
      side.slot,
    )
  }
  if (wide && side) return null
  return (
    <Modal open onOpenChange={(o) => !o && setOpen(false)} title="Observations">
      {panel(() => setOpen(false))}
    </Modal>
  )
}
