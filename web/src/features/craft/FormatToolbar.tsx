/**
 * The buttons above a note's text box. Each one writes the formatting characters for you.
 *
 * The buttons cancel mousedown so the text box keeps focus and its selection: otherwise the
 * click would move focus to the button, and on a phone the keyboard would close.
 */
import { Bold, Heading2, List, ListChecks, ListOrdered, Minus, Table2, TextQuote, Workflow } from 'lucide-react'
import type { ReactNode } from 'react'
import type { LineKind } from './editText'

interface Props {
  onKind: (kind: LineKind) => void
  onBold: () => void
  onSteps: () => void
  onTable: () => void
  onDivider: () => void
}

function Tool({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-dim transition-colors hover:bg-ink-3 hover:text-paper">
      {children}
    </button>
  )
}

const Gap = () => <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-rule" />

export function FormatToolbar({ onKind, onBold, onSteps, onTable, onDivider }: Props) {
  return (
    <div role="toolbar" aria-label="Formatting" className="flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
      <Tool label="Heading" onClick={() => onKind('heading')}><Heading2 size={18} /></Tool>
      <Tool label="Bold (Cmd+B)" onClick={onBold}><Bold size={17} /></Tool>
      <Gap />
      <Tool label="List" onClick={() => onKind('list')}><List size={18} /></Tool>
      <Tool label="Numbered list" onClick={() => onKind('numbered')}><ListOrdered size={18} /></Tool>
      <Tool label="Tick boxes" onClick={() => onKind('tick')}><ListChecks size={18} /></Tool>
      <Gap />
      <Tool label="Callout" onClick={() => onKind('callout')}><TextQuote size={18} /></Tool>
      <Tool label="Steps" onClick={onSteps}><Workflow size={17} /></Tool>
      <Tool label="Table" onClick={onTable}><Table2 size={17} /></Tool>
      <Tool label="Divider" onClick={onDivider}><Minus size={18} /></Tool>
    </div>
  )
}
