/** A bit in the library feed. Tap to open; the ⋯ menu offers Edit, Studio and Delete. */
import { Clock, MoreHorizontal, Pencil, Sparkles, Trash2 } from 'lucide-react'
import type { Bit } from '../../api/types'
import { Flames, TypeChip } from '../../components/ui/bits'
import { Dropdown } from '../../components/ui/Menu'
import { displayTypes } from '../../lib/bitMeta'
import { clock } from '../../lib/duration'
import { useBitDialogs } from '../bits/bitDialogsContext'

export function BitCard({ bit, topicName }: { bit: Bit; topicName?: string }) {
  const dialogs = useBitDialogs()
  const strong = bit.strength >= 4

  return (
    <article
      className={`group mb-4 break-inside-avoid rounded-2xl bg-panel p-4 ring-1 transition hover:bg-raised ${strong ? 'ring-accent/35' : 'ring-line'}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {displayTypes(bit.types).map((t) => <TypeChip key={t} name={t} />)}
        </div>
        <Dropdown
          trigger={
            <button type="button" aria-label="Bit options" className="-mt-1 -mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-faint hover:bg-white/5 hover:text-text">
              <MoreHorizontal size={18} />
            </button>
          }
          items={[
            { label: 'Edit', icon: <Pencil size={16} />, onSelect: () => dialogs.openEditor(bit) },
            { label: 'Open in Studio', icon: <Sparkles size={16} />, onSelect: () => dialogs.openInStudio(bit) },
            { label: 'Delete', icon: <Trash2 size={16} />, danger: true, onSelect: () => void dialogs.deleteBit(bit) },
          ]}
        />
      </div>
      <button type="button" onClick={() => dialogs.openDetail(bit)} className="block w-full space-y-2 text-left">
        <p className="leading-snug text-text">{bit.setup}</p>
        {bit.punchline && <p className="leading-snug text-accent/90">{bit.punchline}</p>}
        {bit.tag_lines.length > 0 && (
          <p className="text-xs text-faint">+{bit.tag_lines.length} tag line{bit.tag_lines.length > 1 ? 's' : ''}</p>
        )}
      </button>
      <div className="mt-4 flex items-center justify-between gap-2 text-xs text-faint">
        <span className="flex min-w-0 items-center gap-3">
          <Flames strength={bit.strength} size={12} />
          {bit.duration_seconds > 0 && (
            <span className="inline-flex items-center gap-1 tabular"><Clock size={12} />{clock(bit.duration_seconds)}</span>
          )}
        </span>
        <span className="truncate">{bit.status ?? topicName}</span>
      </div>
    </article>
  )
}
