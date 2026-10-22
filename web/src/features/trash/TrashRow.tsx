/** One thing in the Trash: what it was, how long it has left, and Put back or Delete now. */
import { Undo2, X } from 'lucide-react'
import type { TrashItem } from '../../api/trash'
import { Button, IconButton } from '../../components/ui/Button'
import { formatDate } from '../../lib/time'

const DAY = 86_400_000

/** "27 days left", or "Last day" when it goes within a day. */
function timeLeft(eraseAt: string, now = Date.now()): string {
  const days = Math.ceil((new Date(eraseAt).getTime() - now) / DAY)
  return days <= 1 ? 'Last day' : `${days} days left`
}

interface Props {
  item: TrashItem
  onRestore: () => void
  onErase: () => void
}

export function TrashRow({ item, onRestore, onErase }: Props) {
  const title = item.when ? `${item.title}, ${formatDate(item.when)}` : item.title
  return (
    <li className="flex items-center gap-3 rounded-xl bg-ink-2 py-3 pr-2 pl-4 ring-1 ring-rule">
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-paper">{title}</p>
        {item.detail && <p className="line-clamp-1 text-sm text-dim">{item.detail}</p>}
        <p className="mt-0.5 text-xs text-faint tabular">Deleted {formatDate(item.deleted_at)}, {timeLeft(item.erase_at)}</p>
      </div>
      <Button small icon={<Undo2 size={16} />} onClick={onRestore}>Put back</Button>
      <IconButton label={`Delete ${item.title} now`} onClick={onErase} className="hover:text-light"><X size={18} /></IconButton>
    </li>
  )
}
