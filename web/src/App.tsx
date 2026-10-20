import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { Spinner } from './components/ui/bits'
import { LoginPage } from './features/auth/LoginPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { TodayPage } from './features/today/TodayPage'
import { AppShell } from './layout/AppShell'

const named = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })))

// Screens beyond Today load on first visit, so the app opens fast on a phone.
const BitsLayout = named(() => import('./features/bits/BitsLayout'), 'BitsLayout')
const NoBitSelected = named(() => import('./features/bits/BitsLayout'), 'NoBitSelected')
const BitPage = named(() => import('./features/bits/BitPage'), 'BitPage')
const RewritePage = named(() => import('./features/bits/RewritePage'), 'RewritePage')
const SetsPage = named(() => import('./features/sets/SetsPage'), 'SetsPage')
const SetBuilder = named(() => import('./features/sets/SetBuilder'), 'SetBuilder')
const StageView = named(() => import('./features/sets/StageView'), 'StageView')
const PrintView = named(() => import('./features/sets/PrintView'), 'PrintView')
const ShowsPage = named(() => import('./features/shows/ShowsPage'), 'ShowsPage')
const ObservationsPage = named(() => import('./features/observations/ObservationsPage'), 'ObservationsPage')

const full = (el: React.ReactNode) => <RequireAuth>{el}</RequireAuth>

export function App() {
  return (
    <Suspense fallback={<div className="p-8"><Spinner /></div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={full(<AppShell />)}>
          <Route index element={<TodayPage />} />
          <Route path="bits" element={<BitsLayout />}>
            <Route index element={<NoBitSelected />} />
            <Route path=":bitId" element={<BitPage />} />
          </Route>
          <Route path="sets" element={<SetsPage />} />
          <Route path="sets/:setId" element={<SetBuilder />} />
          <Route path="shows" element={<ShowsPage />} />
          <Route path="observations" element={<ObservationsPage />} />
        </Route>
        {/* Full-screen modes without the app frame. */}
        <Route path="/bits/:bitId/rewrite" element={full(<RewritePage />)} />
        <Route path="/sets/:setId/stage" element={full(<StageView />)} />
        <Route path="/sets/:setId/print" element={full(<PrintView />)} />
        {/* Old addresses from the first version. */}
        <Route path="/studio/*" element={<Navigate to="/bits" replace />} />
        <Route path="/setlist/*" element={<Navigate to="/sets" replace />} />
        <Route path="/performance" element={<Navigate to="/shows" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
