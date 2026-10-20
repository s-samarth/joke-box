/** Pen, eraser, ink colours, undo and clear for the handwriting page. */
import { Eraser, PenLine, Trash2, Undo2 } from 'lucide-react'
import { IconButton } from '../../components/ui/Button'
import { INK_COLORS } from './ink'
import type { InkTool } from './InkCanvas'

interface Props {
  tool: InkTool
  color: string
  onTool: (tool: InkTool) => void
  onColor: (color: string) => void
  onUndo: () => void
  onClear: () => void
  hasInk: boolean
}

const toolButton = (on: boolean) =>
  `inline-flex size-10 items-center justify-center rounded-lg transition ${on ? 'bg-paper text-ink' : 'text-dim hover:bg-ink-3 hover:text-paper'}`

export function InkToolbar({ tool, color, onTool, onColor, onUndo, onClear, hasInk }: Props) {
  return (
    <div className="flex items-center gap-1" role="toolbar" aria-label="Handwriting tools">
      <button type="button" aria-label="Pen" aria-pressed={tool === 'pen'} onClick={() => onTool('pen')} className={toolButton(tool === 'pen')}><PenLine size={18} /></button>
      <button type="button" aria-label="Eraser" aria-pressed={tool === 'eraser'} onClick={() => onTool('eraser')} className={toolButton(tool === 'eraser')}><Eraser size={18} /></button>
      <div className="mx-1.5 flex items-center gap-1.5">
        {INK_COLORS.map((c) => (
          <button key={c} type="button" aria-label={`Ink colour ${c}`} aria-pressed={tool === 'pen' && color === c}
            onClick={() => { onColor(c); onTool('pen') }}
            className={`size-7 rounded-full ring-offset-2 ring-offset-ink transition ${tool === 'pen' && color === c ? 'ring-2 ring-paper' : ''}`} style={{ background: c }} />
        ))}
      </div>
      <IconButton label="Undo" onClick={onUndo} disabled={!hasInk}><Undo2 size={18} /></IconButton>
      <IconButton label="Clear page" onClick={onClear} disabled={!hasInk}><Trash2 size={17} /></IconButton>
    </div>
  )
}
