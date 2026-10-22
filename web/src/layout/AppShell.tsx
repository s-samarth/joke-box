/**
 * The frame around every signed-in screen. Desktop: a slim left rail with every screen.
 * Phone: a bottom bar (see BottomBar) with Home, Jokes, a big + for capture, Shows and More.
 */
import { Plus } from 'lucide-react'
import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Spinner } from '../components/ui/bits'
import { CaptureProvider } from '../features/capture/CaptureProvider'
import { useCapture } from '../features/capture/captureContext'
import { AccountMenu } from './AccountMenu'
import { BottomBar } from './BottomBar'
import { NAV } from './nav'
import { SyncLight } from './SyncLight'
import { UnsyncedBanner } from './UnsyncedBanner'
import { UpdatePrompt } from './UpdatePrompt'
import { useCloseWarning } from './useCloseWarning'

function Rail() {
  const { openCapture } = useCapture()
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-rule bg-ink px-4 py-6 lg:flex">
      <p className="headline px-2 text-[32px]">JokeBox</p>
      <button type="button" onClick={() => openCapture()} className="mt-6 flex h-11 items-center gap-2 rounded-lg bg-tape px-3 font-semibold text-tape-ink hover:bg-[#f5da77]">
        <Plus size={20} /> New joke
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

export function AppShell() {
  useCloseWarning()
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
          <UnsyncedBanner />
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
