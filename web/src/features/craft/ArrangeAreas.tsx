/** Put your areas in the order you want them, by dragging a grip, and open any one to edit it. */
import { Pencil } from 'lucide-react'
import { useReorderAreas } from '../../api/craft'
import type { CraftArea } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { SortableList } from '../../components/ui/SortableList'
import { useFeedback } from '../../components/ui/feedbackContext'
import { areaColor, noteNumber } from './craftMeta'

interface Props {
  areas: CraftArea[]
  counts: Map<string, number>
  onEdit: (area: CraftArea) => void
  onClose: () => void
}

export function ArrangeAreas({ areas, counts, onEdit, onClose }: Props) {
  const reorder = useReorderAreas()
  const { toast } = useFeedback()
  const save = (ids: string[]) => reorder.mutate(ids, { onError: (e) => toast(`Order not saved: ${e.message}`) })
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Arrange areas" description="Craft and the lesson box list them in this order. Drag a grip; it saves as you drop.">
      <SortableList items={areas} onReorder={save} label={(a) => a.name} className="divide-y divide-rule border-y border-rule" rowClassName="py-1">
        {(a) => (
          <div className="flex min-h-10 items-center gap-2">
            <span className="w-5 shrink-0 text-xs font-semibold tracking-wider text-faint tabular">{noteNumber(areas.indexOf(a))}</span>
            <span className="size-3 shrink-0 rounded-full" style={{ background: areaColor(a.color) }} aria-hidden />
            <span className="min-w-0 flex-1 truncate">{a.name}</span>
            <span className="text-sm text-faint tabular">{counts.get(a.id) ?? 0}</span>
            <IconButton label={`Edit ${a.name}`} onClick={() => onEdit(a)}><Pencil size={15} /></IconButton>
          </div>
        )}
      </SortableList>
    </Modal>
  )
}
