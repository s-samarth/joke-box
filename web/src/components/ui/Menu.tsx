/**
 * Menus on Radix primitives. Dropdown opens from a button; WithContextMenu opens on
 * right-click on desktop and long-press on touch.
 */
import * as ContextMenu from '@radix-ui/react-context-menu'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
  checked?: boolean
}

const panel = 'z-50 max-h-[70dvh] min-w-48 overflow-y-auto rounded-xl bg-ink-3 p-1.5 shadow-lift ring-1 ring-rule-strong'
const row = (danger?: boolean) =>
  `flex h-10 cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 text-[15px] outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-ink-4 ${danger ? 'text-light' : 'text-paper'}`

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
            {i.checked && <Check size={16} className="text-tape" />}
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
        <DropdownMenu.Content align={align} sideOffset={6} className={panel} onCloseAutoFocus={(e) => keepFocus?.() && e.preventDefault()}>
          <Items items={items} Item={DropdownMenu.Item} />
        </DropdownMenu.Content>
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
        <ContextMenu.Content className={panel}>
          <Items items={items} Item={ContextMenu.Item as typeof DropdownMenu.Item} />
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
