import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { Spinner } from './components/ui/bits'
import { LoginPage } from './features/auth/LoginPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { LibraryPage } from './features/library/LibraryPage'
import { AppShell } from './layout/AppShell'

// Screens other than the library load on first visit, so the app opens faster on a phone.
const StudioPage = lazy(() => import('./features/studio/StudioPage').then((m) => ({ default: m.StudioPage })))
const SetlistPage = lazy(() => import('./features/setlists/SetlistPage').then((m) => ({ default: m.SetlistPage })))
const StageView = lazy(() => import('./features/setlists/StageView').then((m) => ({ default: m.StageView })))
const PrintView = lazy(() => import('./features/setlists/PrintView').then((m) => ({ default: m.PrintView })))
const PerformancePage = lazy(() =>
  import('./features/performance/PerformancePage').then((m) => ({ default: m.PerformancePage })),
)

export function App() {
  return (
    <Suspense fallback={<div className="py-24"><Spinner /></div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<LibraryPage />} />
          <Route path="studio/:bitId?" element={<StudioPage />} />
          <Route path="setlist/:setlistId?" element={<SetlistPage />} />
          <Route path="performance" element={<PerformancePage />} />
        </Route>
        {/* Full-screen views without the app chrome. */}
        <Route path="/setlist/:setlistId/stage" element={<RequireAuth><StageView /></RequireAuth>} />
        <Route path="/setlist/:setlistId/print" element={<RequireAuth><PrintView /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
