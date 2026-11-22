/** Put an area's notes in reading order: drag a row by its grip, and the order saves on drop. */
import { useReorderNotes } from '../../api/craft'
import type { CraftArea, CraftNote } from '../../api/types'
import { Modal } from '../../components/ui/Modal'
import { SortableList } from '../../components/ui/SortableList'
import { useFeedback } from '../../components/ui/feedbackContext'
import { areaColor, noteNumber } from './craftMeta'

export function ArrangeNotes({ area, notes, onClose }: { area: CraftArea; notes: CraftNote[]; onClose: () => void }) {
  const reorder = useReorderNotes()
  const { toast } = useFeedback()
  const save = (ids: string[]) => reorder.mutate({ areaId: area.id, ids }, { onError: (e) => toast(`Order not saved: ${e.message}`) })
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Arrange notes" description={`The order ${area.name} lists them in. Drag a grip; it saves as you drop.`}>
      <SortableList items={notes} onReorder={save} label={(n) => n.title} className="divide-y divide-rule border-y border-rule" rowClassName="py-1">
        {(n) => (
          <div className="flex min-h-10 items-center gap-3">
            <span className="w-5 shrink-0 text-xs font-semibold tracking-wider tabular" style={{ color: areaColor(area.color) }}>{noteNumber(notes.indexOf(n))}</span>
            <span className="min-w-0 flex-1 truncate">{n.title}</span>
          </div>
        )}
      </SortableList>
    </Modal>
  )
}
