/**
 * The "+" menu for adding a block to a note.
 */
import { Heading2, List, ListChecks, ListOrdered, Minus, Plus, Table2, TextQuote, Type, Workflow } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { Dropdown } from '../../components/ui/Menu'
import type { NewBlock } from './blockEdit'

const KINDS: { kind: NewBlock; label: string; icon: ReactNode }[] = [
  { kind: 'text', label: 'Text', icon: <Type size={16} /> },
  { kind: 'heading', label: 'Heading', icon: <Heading2 size={16} /> },
  { kind: 'list', label: 'List', icon: <List size={16} /> },
  { kind: 'numbered', label: 'Numbered list', icon: <ListOrdered size={16} /> },
  { kind: 'tick', label: 'Tick boxes', icon: <ListChecks size={16} /> },
  { kind: 'callout', label: 'Callout', icon: <TextQuote size={16} /> },
  { kind: 'steps', label: 'Steps', icon: <Workflow size={16} /> },
  { kind: 'table', label: 'Table', icon: <Table2 size={16} /> },
  { kind: 'divider', label: 'Divider', icon: <Minus size={16} /> },
]

interface Props {
  onPick: (kind: NewBlock) => void
  /** The button that opens the menu; a "+" by default. */
  trigger?: ReactNode
  label?: string
}

export function AddBlockMenu({ onPick, trigger, label = 'Add a block below' }: Props) {
  const button = trigger ?? (
    <button type="button" aria-label={label} title={label} className="inline-flex size-8 items-center justify-center rounded-md text-dim hover:bg-ink-3 hover:text-paper">
      <Plus size={16} />
    </button>
  )
  // Picking opens a text box or the table sheet, which takes focus; the menu mustn't take it back.
  const picked = useRef(false)
  const items = KINDS.map((k) => ({ label: k.label, icon: k.icon, onSelect: () => { picked.current = true; onPick(k.kind) } }))
  const keepFocus = () => {
    const keep = picked.current
    picked.current = false
    return keep
  }
  return <Dropdown align="start" trigger={button} items={items} keepFocus={keepFocus} />
}
