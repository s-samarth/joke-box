/**
 * Pen, eraser, ink colour and size, undo, clear, "draw with finger" and the page controls
 * for handwriting. Colour and size are in PenStyle.tsx.
 */
import { ChevronLeft, ChevronRight, Eraser, FileMinus, FilePlus, Hand, PenLine, Trash2, Undo2 } from 'lucide-react'
import { IconButton } from '../../components/ui/Button'
import { MAX_PAGES } from './ink'
import type { InkTool } from './InkCanvas'
import { PenStyle, QuickPens } from './PenStyle'

interface Props {
  tool: InkTool
  color: string
  size: number
  onTool: (tool: InkTool) => void
  onColor: (color: string) => void
  onSize: (size: number) => void
  onUndo: () => void
  /** Clears the page if it has ink, otherwise deletes it (if it isn't the only one). */
  onClear: () => void
  hasInk: boolean
  page: number
  pages: number
  onPage: (page: number) => void
  onAddPage: () => void
  fingerDraws: boolean
  onFingerDraws: (on: boolean) => void
}

const toolButton = (on: boolean) =>
  `inline-flex size-10 items-center justify-center rounded-lg transition ${on ? 'bg-paper text-ink' : 'text-dim hover:bg-ink-3 hover:text-paper'}`

export function InkToolbar({ tool, color, size, onTool, onColor, onSize, onUndo, onClear, hasInk, page, pages, onPage, onAddPage, fingerDraws, onFingerDraws }: Props) {
  const pen = { color, size, onColor: (c: string) => { onColor(c); onTool('pen') }, onSize: (s: number) => { onSize(s); onTool('pen') } }
  const deletes = !hasInk && pages > 1
  return (
    <div className="flex flex-wrap items-center gap-y-1 sm:gap-x-1" role="toolbar" aria-label="Handwriting tools">
      <button type="button" aria-label="Pen" aria-pressed={tool === 'pen'} onClick={() => onTool('pen')} className={toolButton(tool === 'pen')}><PenLine size={18} /></button>
      <button type="button" aria-label="Eraser" aria-pressed={tool === 'eraser'} onClick={() => onTool('eraser')} className={toolButton(tool === 'eraser')}><Eraser size={18} /></button>
      <PenStyle {...pen} />
      <QuickPens {...pen} />
      <button type="button" aria-label="Draw with finger" title={fingerDraws ? 'Fingers draw. Tap so only the Pencil draws' : 'Only the Pencil draws. Tap to draw with a finger too'}
        aria-pressed={fingerDraws} onClick={() => onFingerDraws(!fingerDraws)} className={toolButton(fingerDraws)}><Hand size={18} /></button>
      <IconButton label="Undo" onClick={onUndo} disabled={!hasInk}><Undo2 size={18} /></IconButton>
      <IconButton label={deletes ? 'Delete page' : 'Clear page'} onClick={onClear} disabled={!hasInk && pages === 1}>
        {deletes ? <FileMinus size={17} /> : <Trash2 size={17} />}
      </IconButton>
      <div className="ml-auto flex items-center" role="group" aria-label="Pages">
        <IconButton label="Previous page" onClick={() => onPage(page - 1)} disabled={page === 0}><ChevronLeft size={18} /></IconButton>
        <span className="min-w-9 text-center text-sm text-dim tabular" aria-live="polite">{page + 1} / {pages}</span>
        <IconButton label="Next page" onClick={() => onPage(page + 1)} disabled={page === pages - 1}><ChevronRight size={18} /></IconButton>
        <IconButton label="Add page" onClick={onAddPage} disabled={pages >= MAX_PAGES}><FilePlus size={17} /></IconButton>
      </div>
    </div>
  )
}
