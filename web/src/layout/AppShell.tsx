/**
 * The frame around every signed-in screen. Desktop: a slim left rail. Phone: a bottom bar with
 * Today, Bits, a big + for capture, Sets and Shows.
 */
import { Home, ListOrdered, Mic, Plus, StickyNote } from 'lucide-react'
import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Spinner } from '../components/ui/bits'
import { CaptureProvider } from '../features/capture/CaptureProvider'
import { useCapture } from '../features/capture/captureContext'
import { AccountMenu } from './AccountMenu'
import { SyncLight } from './SyncLight'
import { UpdatePrompt } from './UpdatePrompt'

const NAV = [
  { to: '/', label: 'Today', icon: Home, end: true },
  { to: '/bits', label: 'Bits', icon: StickyNote, end: false },
  { to: '/sets', label: 'Sets', icon: ListOrdered, end: false },
  { to: '/shows', label: 'Shows', icon: Mic, end: false },
]

function Rail() {
  const { openCapture } = useCapture()
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-rule bg-ink px-4 py-6 lg:flex">
      <p className="headline px-2 text-[32px]">JokeBox</p>
      <button type="button" onClick={() => openCapture()} className="mt-6 flex h-11 items-center gap-2 rounded-lg bg-tape px-3 font-semibold text-tape-ink hover:bg-[#f5da77]">
        <Plus size={20} /> New bit
      </button>
      <nav className="mt-6 space-y-1" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex h-10 items-center gap-3 rounded-lg px-2.5 text-[15px] transition-colors ${isActive ? 'bg-ink-3 text-paper' : 'text-dim hover:text-paper'}`}>
            <Icon size={19} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-3">
        <div className="px-2"><SyncLight withLabel /></div>
        <AccountMenu showName />
      </div>
    </aside>
  )
}

function BottomBar() {
  const { openCapture } = useCapture()
  const item = 'flex h-full flex-1 flex-col items-center justify-center gap-1 text-[11px]'
  const [left, right] = [NAV.slice(0, 2), NAV.slice(2)]
  const link = ({ to, label, icon: Icon, end }: (typeof NAV)[number]) => (
    <NavLink key={to} to={to} end={end} className={({ isActive }) => `${item} ${isActive ? 'text-paper' : 'text-faint'}`}>
      <Icon size={22} /> {label}
    </NavLink>
  )
  return (
    <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-ink/95 backdrop-blur lg:hidden">
      <div className="flex h-16 items-stretch">
        {left.map(link)}
        <div className="flex flex-1 items-center justify-center">
          <button type="button" onClick={() => openCapture()} aria-label="New bit" className="-mt-6 flex size-14 items-center justify-center rounded-2xl bg-tape text-tape-ink shadow-lift active:bg-tape-deep">
            <Plus size={28} strokeWidth={2.4} />
          </button>
        </div>
        {right.map(link)}
      </div>
    </nav>
  )
}

export function AppShell() {
  return (
    <CaptureProvider>
      <div className="min-h-dvh lg:pl-60">
        <Rail />
        <header className="pt-safe sticky top-0 z-30 flex h-[calc(3.25rem+env(safe-area-inset-top))] items-center justify-between border-b border-rule bg-ink/95 px-4 backdrop-blur lg:hidden">
          <span className="headline text-2xl">JokeBox</span>
          <div className="flex items-center gap-1">
            <SyncLight />
            <AccountMenu />
          </div>
        </header>
        <main className="px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pb-12">
          <Suspense fallback={<div className="py-16"><Spinner /></div>}>
            <Outlet />
          </Suspense>
        </main>
        <BottomBar />
        <UpdatePrompt />
      </div>
    </CaptureProvider>
  )
}
