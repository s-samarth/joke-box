/**
 * Pen, eraser, ink colour and size, undo, clear, and the page controls for handwriting.
 *
 * Colour and size live in one small menu (a Radix dropdown) so the bar fits a phone. Picking
 * keeps the menu open, so you can set both; tap anywhere else to close it.
 */
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronLeft, ChevronRight, Eraser, FileMinus, FilePlus, PenLine, Trash2, Undo2 } from 'lucide-react'
import { IconButton } from '../../components/ui/Button'
import { INK_COLORS, INK_SIZES, MAX_PAGES } from './ink'
import type { InkTool } from './InkCanvas'

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
}

const toolButton = (on: boolean) =>
  `inline-flex size-10 items-center justify-center rounded-lg transition ${on ? 'bg-paper text-ink' : 'text-dim hover:bg-ink-3 hover:text-paper'}`

/** Dot diameter in px for a pen size, used on the menu button and the size choices. */
const dot = (size: number) => Math.round(5 + size * 1.3)

const choice = 'flex cursor-pointer items-center justify-center outline-none data-[highlighted]:ring-2 data-[highlighted]:ring-rule-strong'

function PenStyle({ color, size, onColor, onSize }: Pick<Props, 'color' | 'size' | 'onColor' | 'onSize'>) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label="Pen colour and size" title="Pen colour and size" className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-ink-3">
          <span className="rounded-full ring-1 ring-rule-strong" style={{ background: color, width: Math.min(dot(size), 22), height: Math.min(dot(size), 22) }} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className="z-50 w-64 rounded-xl bg-ink-3 p-3 shadow-lift ring-1 ring-rule-strong">
          <DropdownMenu.Label className="mb-2 text-xs uppercase tracking-wide text-faint">Colour</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={color} onValueChange={onColor} className="grid grid-cols-6 gap-1">
            {INK_COLORS.map((c) => (
              <DropdownMenu.RadioItem key={c} value={c} aria-label={`Ink colour ${c}`} onSelect={(e) => e.preventDefault()}
                className={`${choice} group size-9 rounded-full`}>
                <span className="size-7 rounded-full ring-offset-2 ring-offset-ink-3 group-data-[state=checked]:ring-2 group-data-[state=checked]:ring-paper" style={{ background: c }} />
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Label className="mb-2 mt-4 text-xs uppercase tracking-wide text-faint">Size</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={String(size)} onValueChange={(v) => onSize(Number(v))} className="flex justify-between">
            {INK_SIZES.map((s) => (
              <DropdownMenu.RadioItem key={s.size} value={String(s.size)} aria-label={s.label} onSelect={(e) => e.preventDefault()}
                className={`${choice} size-10 rounded-lg data-[state=checked]:bg-ink-4`}>
                <span className="rounded-full" style={{ background: color, width: dot(s.size), height: dot(s.size) }} />
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function InkToolbar({ tool, color, size, onTool, onColor, onSize, onUndo, onClear, hasInk, page, pages, onPage, onAddPage }: Props) {
  const deletes = !hasInk && pages > 1
  return (
    <div className="flex flex-wrap items-center gap-y-1 sm:gap-x-1" role="toolbar" aria-label="Handwriting tools">
      <button type="button" aria-label="Pen" aria-pressed={tool === 'pen'} onClick={() => onTool('pen')} className={toolButton(tool === 'pen')}><PenLine size={18} /></button>
      <button type="button" aria-label="Eraser" aria-pressed={tool === 'eraser'} onClick={() => onTool('eraser')} className={toolButton(tool === 'eraser')}><Eraser size={18} /></button>
      <PenStyle color={color} size={size} onColor={(c) => { onColor(c); onTool('pen') }} onSize={(s) => { onSize(s); onTool('pen') }} />
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
