/**
 * The phone's bottom bar: Home, Jokes, a big + (it adds whatever the current screen holds), Premises, and More. More opens a sheet
 * with every other screen, so nothing is more than two taps away and the + stays in the middle.
 */
import { LayoutGrid, Plus } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { Modal } from '../components/ui/Modal'
import { BAR_LEFT, BAR_RIGHT, MORE_GROUPS, inMore, type NavItem } from './nav'
import { useAddAction } from './useAddAction'

const tab = (current: boolean) => `flex h-full flex-1 flex-col items-center justify-center gap-1 text-[11px] ${current ? 'text-paper' : 'text-faint'}`

function Tab({ to, label, icon: Icon, end }: NavItem) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => tab(isActive)}>
      <Icon size={22} /> {label}
    </NavLink>
  )
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="More">
      <div className="pb-safe space-y-5">
        {MORE_GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-1 text-sm text-faint">{group.title}</h3>
            <ul className="divide-y divide-rule">
              {group.items.map(({ to, label, hint, icon: Icon }) => (
                <li key={to}>
                  {/* Pattern: NavLink knows if its route is the current one, so the page you're on stands out. */}
                  <NavLink to={to} onClick={onClose}
                    className={({ isActive }) => `-mx-2 flex min-h-14 items-center gap-3.5 rounded-lg px-2 py-2 ${isActive ? 'bg-ink-3' : 'active:bg-ink-3'}`}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-3 text-tape"><Icon size={19} /></span>
                    <span className="min-w-0">
                      <span className="block font-medium">{label}</span>
                      {hint && <span className="block truncate text-sm text-faint">{hint}</span>}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  )
}

export function BottomBar() {
  const add = useAddAction()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  return (
    <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-ink/95 backdrop-blur lg:hidden">
      <div className="flex h-16 items-stretch">
        {BAR_LEFT.map((item) => <Tab key={item.to} {...item} />)}
        <div className="flex flex-1 items-center justify-center">
          <button type="button" onClick={add.run} aria-label={add.label} className="-mt-6 flex size-14 items-center justify-center rounded-2xl bg-tape text-tape-ink shadow-lift active:bg-tape-deep">
            <Plus size={28} strokeWidth={2.4} />
          </button>
        </div>
        {BAR_RIGHT.map((item) => <Tab key={item.to} {...item} />)}
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-current={inMore(pathname) ? 'page' : undefined} className={tab(open || inMore(pathname))}>
          <LayoutGrid size={22} /> More
        </button>
      </div>
      <MoreSheet open={open} onClose={() => setOpen(false)} />
    </nav>
  )
}
