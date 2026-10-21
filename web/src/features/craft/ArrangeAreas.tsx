/** Put your areas in the order you want them, and open any one to edit it. */
import { ArrowDown, ArrowUp, Pencil } from 'lucide-react'
import { useReorderAreas } from '../../api/craft'
import type { CraftArea } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { areaColor } from './craftMeta'

interface Props {
  areas: CraftArea[]
  counts: Map<string, number>
  onEdit: (area: CraftArea) => void
  onClose: () => void
}

export function ArrangeAreas({ areas, counts, onEdit, onClose }: Props) {
  const reorder = useReorderAreas()
  const move = (from: number, to: number) => {
    const ids = areas.map((a) => a.id)
    const [id] = ids.splice(from, 1)
    ids.splice(to, 0, id)
    reorder.mutate(ids)
  }
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Arrange areas" description="Craft and the lesson box list them in this order.">
      <ul className="divide-y divide-rule border-y border-rule">
        {areas.map((a, i) => (
          <li key={a.id} className="flex items-center gap-2 py-1.5">
            <span className="size-3 shrink-0 rounded-full" style={{ background: areaColor(a.color) }} aria-hidden />
            <span className="min-w-0 flex-1 truncate">{a.name}</span>
            <span className="text-sm text-faint tabular">{counts.get(a.id) ?? 0}</span>
            <IconButton label={`Move ${a.name} up`} disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp size={16} /></IconButton>
            <IconButton label={`Move ${a.name} down`} disabled={i === areas.length - 1} onClick={() => move(i, i + 1)}><ArrowDown size={16} /></IconButton>
            <IconButton label={`Edit ${a.name}`} onClick={() => onEdit(a)}><Pencil size={15} /></IconButton>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
