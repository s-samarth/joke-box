/** Your kinds of note, with how each behaves and how many notes use it. Add, rename or delete. */
import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import type { NoteKind } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { BEHAVIOURS } from './craftMeta'
import { KindSheet } from './KindSheet'
import { KIND_ICONS } from './kindIcons'

export function ManageKinds({ kinds, counts, onClose }: { kinds: NoteKind[]; counts: Map<string, number>; onClose: () => void }) {
  const [editing, setEditing] = useState<NoteKind | 'new' | null>(null)
  if (editing) {
    const kind = editing === 'new' ? undefined : editing
    return <KindSheet kind={kind} kinds={kinds} noteCount={kind ? counts.get(kind.id) ?? 0 : 0} onClose={() => setEditing(null)} />
  }
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Kinds of note" description="Name them how you like. Each one works like one of four things the app knows."
      footer={<Button variant="tape" icon={<Plus size={16} />} onClick={() => setEditing('new')}>New kind</Button>}>
      <ul className="divide-y divide-rule border-y border-rule">
        {kinds.map((k) => {
          const Icon = KIND_ICONS[k.behaviour]
          return (
            <li key={k.id} className="flex items-center gap-3 py-2">
              <Icon size={17} className="shrink-0 text-dim" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{k.name}</span>
                <span className="block text-xs text-faint">Works like {BEHAVIOURS.find((b) => b.key === k.behaviour)?.label.toLowerCase()}</span>
              </span>
              <span className="text-sm text-faint tabular">{counts.get(k.id) ?? 0}</span>
              <IconButton label={`Edit ${k.name}`} onClick={() => setEditing(k)}><Pencil size={15} /></IconButton>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
