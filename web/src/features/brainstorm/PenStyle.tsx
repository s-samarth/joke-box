/**
 * Pen colour and size. On a tablet or laptop the everyday ones sit on the toolbar (QuickPens):
 * five colours and the three thicknesses. The full palette is in a small menu (a Radix
 * dropdown), which is all a phone shows. Picking in the menu keeps it open, so you can set both.
 */
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { INK_COLORS, INK_SIZES, QUICK_COLORS } from './ink'

interface PenProps {
  color: string
  size: number
  onColor: (color: string) => void
  onSize: (size: number) => void
}

/** Dot diameter in px for a pen size, used on the menu button and the size choices. */
const dot = (size: number) => Math.round(5 + size * 1.3)

const choice = 'flex cursor-pointer items-center justify-center outline-none data-[highlighted]:ring-2 data-[highlighted]:ring-rule-strong'

export function PenStyle({ color, size, onColor, onSize }: PenProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label="Pen colour and size" title="Pen colour and size" className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-ink-3">
          <span className="rounded-full ring-1 ring-rule-strong" style={{ background: color, width: Math.min(dot(size), 22), height: Math.min(dot(size), 22) }} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} collisionPadding={8} className="z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] w-64 overflow-y-auto overscroll-contain rounded-xl bg-ink-3 p-3 shadow-lift ring-1 ring-rule-strong">
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
          <DropdownMenu.RadioGroup value={String(size)} onValueChange={(v) => onSize(Number(v))} className="flex gap-2">
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

const pick = (on: boolean) => `inline-flex size-9 items-center justify-center rounded-lg transition ${on ? 'bg-ink-4 ring-1 ring-rule-strong' : 'hover:bg-ink-3'}`

/** The everyday colours and the three thicknesses, one tap each. Hidden on a phone, where space is short. */
export function QuickPens({ color, size, onColor, onSize }: PenProps) {
  return (
    <div className="hidden items-center gap-0.5 sm:flex" role="group" aria-label="Quick pens">
      {QUICK_COLORS.map((q) => (
        <button key={q.color} type="button" aria-label={`${q.name} ink`} title={q.name} aria-pressed={color === q.color} onClick={() => onColor(q.color)} className={pick(color === q.color)}>
          <span className="size-5 rounded-full" style={{ background: q.color }} />
        </button>
      ))}
      <span className="mx-1 h-6 w-px bg-rule" aria-hidden />
      {INK_SIZES.map((s) => (
        <button key={s.size} type="button" aria-label={s.label} title={s.label} aria-pressed={size === s.size} onClick={() => onSize(s.size)} className={pick(size === s.size)}>
          <span className="rounded-full" style={{ background: color, width: dot(s.size), height: dot(s.size) }} />
        </button>
      ))}
    </div>
  )
}
