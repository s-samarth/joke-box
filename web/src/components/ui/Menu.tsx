/**
 * Menus on Radix primitives. DropdownMenu opens from a button; ContextMenu opens on right-click
 * on desktop and on long-press on touch screens, which replaces the old right-click-only menus.
 */
import * as ContextMenu from '@radix-ui/react-context-menu'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

const panel = 'z-50 min-w-44 rounded-2xl bg-raised p-1.5 shadow-pop ring-1 ring-line-strong'
const item = (danger?: boolean) =>
  `flex h-10 cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-white/5 ${danger ? 'text-danger' : 'text-text'}`

export function Dropdown({ trigger, items }: { trigger: ReactNode; items: MenuItem[] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={panel} onClick={(e) => e.stopPropagation()}>
          {items.map((i) => (
            <DropdownMenu.Item key={i.label} className={item(i.danger)} disabled={i.disabled} onSelect={i.onSelect}>
              {i.icon}
              {i.label}
            </DropdownMenu.Item>
          ))}
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
          {items.map((i) => (
            <ContextMenu.Item key={i.label} className={item(i.danger)} disabled={i.disabled} onSelect={i.onSelect}>
              {i.icon}
              {i.label}
            </ContextMenu.Item>
          ))}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
