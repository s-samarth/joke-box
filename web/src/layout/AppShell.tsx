/**
 * The signed-in frame. Desktop: fixed sidebar. Phone: a top bar, a slide-in drawer for the
 * topic tree, and a bottom tab bar (Library, Bits, Setlist, Perf, Studio).
 */
import * as Dialog from '@radix-ui/react-dialog'
import { BarChart3, FolderTree, Layers, ListMusic, Menu, Sparkles } from 'lucide-react'
import { Suspense, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Spinner } from '../components/ui/bits'
import { BitDialogsProvider } from '../features/bits/BitDialogs'
import { Brand, Sidebar } from './Sidebar'
import { SyncLight } from './SyncLight'
import { UpdatePrompt } from './UpdatePrompt'

const TABS = [
  { to: '/setlist', label: 'Setlist', icon: ListMusic },
  { to: '/performance', label: 'Perf', icon: BarChart3 },
  { to: '/studio', label: 'Studio', icon: Sparkles },
]
const tab = 'flex h-full flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium'

export function AppShell() {
  const [drawer, setDrawer] = useState(false)
  const path = useLocation().pathname
  const close = () => setDrawer(false)

  return (
    <BitDialogsProvider>
      <div className="min-h-dvh lg:pl-72">
        <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-line bg-panel lg:block">
          <Sidebar />
        </aside>

        <header className="pt-safe sticky top-0 z-30 border-b border-line bg-ink/95 lg:hidden">
          <div className="flex h-14 items-center justify-between px-2">
            <button type="button" onClick={() => setDrawer(true)} aria-label="Open folders" className="inline-flex size-11 items-center justify-center rounded-xl text-muted">
              <Menu size={22} />
            </button>
            <Brand />
            <div className="flex size-11 items-center justify-center"><SyncLight compact /></div>
          </div>
        </header>

        <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-10">
          <Suspense fallback={<div className="py-24"><Spinner /></div>}>
            <Outlet />
          </Suspense>
        </main>

        <nav aria-label="Sections" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel/95 lg:hidden">
          <div className="flex h-16">
            <button type="button" onClick={() => setDrawer(true)} className={`${tab} ${drawer ? 'text-accent' : 'text-faint'}`}>
              <FolderTree size={22} /> Library
            </button>
            <NavLink to="/" end className={() => `${tab} ${path === '/' && !drawer ? 'text-accent' : 'text-faint'}`}>
              <Layers size={22} /> Bits
            </NavLink>
            {TABS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `${tab} ${isActive ? 'text-accent' : 'text-faint'}`}>
                <Icon size={22} /> {label}
              </NavLink>
            ))}
          </div>
        </nav>

        <Dialog.Root open={drawer} onOpenChange={setDrawer}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 lg:hidden" />
            <Dialog.Content className="pt-safe fixed inset-y-0 left-0 z-50 w-[85vw] max-w-80 bg-panel ring-1 ring-line-strong outline-none lg:hidden">
              <Dialog.Title className="sr-only">Folders and sections</Dialog.Title>
              <Dialog.Description className="sr-only">Pick a topic or section</Dialog.Description>
              <Sidebar onNavigate={close} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <UpdatePrompt />
      </div>
    </BitDialogsProvider>
  )
}
