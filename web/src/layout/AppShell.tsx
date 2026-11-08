/**
 * The frame around every signed-in screen. Desktop and iPad: a rail down the left with every screen
 * (see Rail), compact on an iPad in landscape. Phone: a bottom bar (see BottomBar) with Home, Jokes,
 * a big + for adding, Ideas (Premises and Observations) and More.
 */
import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { Spinner } from '../components/ui/pieces'
import { CaptureProvider } from '../features/capture/CaptureProvider'
import { AccountMenu } from './AccountMenu'
import { BottomBar } from './BottomBar'
import { Rail } from './Rail'
import { SyncLight } from './SyncLight'
import { UnsyncedBanner } from './UnsyncedBanner'
import { UpdatePrompt } from './UpdatePrompt'
import { useCloseWarning } from './useCloseWarning'
import { useRail } from './useRail'

export function AppShell() {
  useCloseWarning()
  const rail = useRail()
  return (
    <CaptureProvider>
      <div className={`min-h-dvh ${rail.compact ? 'lg:pl-16' : 'lg:pl-60'}`}>
        <Rail compact={rail.compact} onToggle={rail.toggle} />
        <header className="pt-safe sticky top-0 z-30 flex h-[calc(3.25rem+env(safe-area-inset-top))] items-center justify-between border-b border-rule bg-ink/95 px-4 backdrop-blur lg:hidden">
          <span className="headline text-2xl">JokeBox</span>
          <div className="flex items-center gap-1">
            <SyncLight />
            <AccountMenu />
          </div>
        </header>
        <main className="px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-[env(safe-area-inset-top)] lg:pb-12">
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
