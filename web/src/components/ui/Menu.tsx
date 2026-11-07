/**
 * Menus on Radix primitives. Dropdown opens from a button; WithContextMenu opens on
 * right-click on desktop and long-press on touch.
 *
 * A long menu (every topic, then Manage topics) never runs off a phone screen: it is only as tall
 * as the room Radix measures between where it opens and the screen's edge, keeps clear of the
 * phone's bottom bar (so it flips up when there's more room above), and scrolls inside.
 */
import * as ContextMenu from '@radix-ui/react-context-menu'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
  checked?: boolean
  /** A quiet note at the end of the row, such as how many things it holds. */
  count?: number
}

const look = 'z-50 min-w-48 overflow-y-auto overscroll-contain rounded-xl bg-ink-3 p-1.5 shadow-lift ring-1 ring-rule-strong'
const dropdownPanel = `${look} max-h-[min(70dvh,var(--radix-dropdown-menu-content-available-height))]`
const contextPanel = `${look} max-h-[min(70dvh,var(--radix-context-menu-content-available-height))]`

/** Room to leave at the screen's edges: the phone's bottom bar (when it shows) and a little more. */
function edgeClearance(): { top: number; bottom: number; left: number; right: number } {
  // The desktop rail is labelled "Main" too, so look for the one actually sitting on the bottom edge.
  const bars = typeof document === 'undefined' ? [] : [...document.querySelectorAll('nav[aria-label="Main"]')]
  const tops = bars.map((b) => b.getBoundingClientRect()).filter((r) => r.height > 0 && r.bottom >= window.innerHeight - 1).map((r) => r.top)
  const bar = tops.length ? window.innerHeight - Math.min(...tops) : 0
  return { top: 8, bottom: bar + 8, left: 8, right: 8 }
}
const row = (danger?: boolean) =>
  `flex h-10 cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 text-[15px] outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-ink-4 ${danger ? 'text-light' : 'text-paper'}`

// Rendered only while open, so the bar is measured when it matters, not on every render.
function DropdownPanel(props: ComponentProps<typeof DropdownMenu.Content>) {
  return <DropdownMenu.Content collisionPadding={edgeClearance()} className={dropdownPanel} {...props} />
}
function ContextPanel(props: ComponentProps<typeof ContextMenu.Content>) {
  return <ContextMenu.Content collisionPadding={edgeClearance()} className={contextPanel} {...props} />
}

function Items({ items, Item }: { items: (MenuItem | 'divider')[]; Item: typeof DropdownMenu.Item }) {
  return (
    <>
      {items.map((i, n) =>
        i === 'divider' ? (
          <div key={`d${n}`} className="my-1 h-px bg-rule" />
        ) : (
          <Item key={i.label} className={row(i.danger)} disabled={i.disabled} onSelect={i.onSelect}>
            {i.icon}
            <span className="flex-1">{i.label}</span>
            {i.count !== undefined && <span className="text-sm text-faint tabular">{i.count}</span>}
            {i.checked ? <Check size={16} className="text-tape" /> : i.count !== undefined && <span className="w-4" />}
          </Item>
        ),
      )}
    </>
  )
}

interface DropdownProps {
  trigger: ReactNode
  items: (MenuItem | 'divider')[]
  align?: 'start' | 'end'
  /** True when the item picked last put focus somewhere itself (a text box it opened), so the
   * menu shouldn't hand focus back to its button on closing. */
  keepFocus?: () => boolean
}

export function Dropdown({ trigger, items, align = 'end', keepFocus }: DropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownPanel align={align} sideOffset={6} onCloseAutoFocus={(e) => keepFocus?.() && e.preventDefault()}>
          <Items items={items} Item={DropdownMenu.Item} />
        </DropdownPanel>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function WithContextMenu({ children, items }: { children: ReactNode; items: MenuItem[] }) {
  if (!items.length) return <>{children}</>
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextPanel>
          <Items items={items} Item={ContextMenu.Item as typeof DropdownMenu.Item} />
        </ContextPanel>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
