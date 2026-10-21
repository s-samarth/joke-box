import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { Spinner } from './components/ui/bits'
import { LoginPage } from './features/auth/LoginPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { TodayPage } from './features/today/TodayPage'
import { AppShell } from './layout/AppShell'

const named = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })))

// Screens beyond Home load on first visit, so the app opens fast on a phone.
const BitsLayout = named(() => import('./features/bits/BitsLayout'), 'BitsLayout')
const NoBitSelected = named(() => import('./features/bits/BitsLayout'), 'NoBitSelected')
const BitPage = named(() => import('./features/bits/BitPage'), 'BitPage')
const RewritePage = named(() => import('./features/bits/RewritePage'), 'RewritePage')
const SetsPage = named(() => import('./features/sets/SetsPage'), 'SetsPage')
const SetBuilder = named(() => import('./features/sets/SetBuilder'), 'SetBuilder')
const StageView = named(() => import('./features/sets/StageView'), 'StageView')
const PrintView = named(() => import('./features/sets/PrintView'), 'PrintView')
const ShowsPage = named(() => import('./features/shows/ShowsPage'), 'ShowsPage')
const BrainstormPage = named(() => import('./features/brainstorm/BrainstormPage'), 'BrainstormPage')
const SessionPage = named(() => import('./features/brainstorm/SessionPage'), 'SessionPage')
const ObservationsPage = named(() => import('./features/observations/ObservationsPage'), 'ObservationsPage')
const VoicePage = named(() => import('./features/voice/VoicePage'), 'VoicePage')
const WatchlistPage = named(() => import('./features/study/WatchlistPage'), 'WatchlistPage')
const AnalysisPage = named(() => import('./features/study/AnalysisPage'), 'AnalysisPage')
const AnalysisEditor = named(() => import('./features/study/AnalysisEditor'), 'AnalysisEditor')
const CraftPage = named(() => import('./features/craft/CraftPage'), 'CraftPage')
const AreaPage = named(() => import('./features/craft/AreaPage'), 'AreaPage')
const CraftNotePage = named(() => import('./features/craft/CraftNotePage'), 'CraftNotePage')
const DailyPage = named(() => import('./features/daily/DailyPage'), 'DailyPage')
const LinksPage = named(() => import('./features/study/LinksPage'), 'LinksPage')
const ImportPage = named(() => import('./features/import/ImportPage'), 'ImportPage')

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
          <Route path="daily" element={<DailyPage />} />
          <Route path="observations" element={<ObservationsPage />} />
          <Route path="brainstorm" element={<BrainstormPage />} />
          <Route path="voice" element={<VoicePage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="analysis/:analysisId" element={<AnalysisEditor />} />
          <Route path="craft" element={<CraftPage />} />
          <Route path="craft/area/:areaId" element={<AreaPage />} />
          <Route path="craft/:noteId" element={<CraftNotePage />} />
          <Route path="links" element={<LinksPage />} />
          <Route path="import" element={<ImportPage />} />
        </Route>
        {/* Full-screen modes without the app frame. */}
        <Route path="/brainstorm/:sessionId" element={full(<SessionPage />)} />
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
