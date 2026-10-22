import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { Spinner } from './components/ui/pieces'
import { LoginPage } from './features/auth/LoginPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { TodayPage } from './features/today/TodayPage'
import { AppShell } from './layout/AppShell'

const named = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })))

// Screens beyond Home load on first visit, so the app opens fast on a phone.
const JokesLayout = named(() => import('./features/jokes/JokesLayout'), 'JokesLayout')
const NoJokeSelected = named(() => import('./features/jokes/JokesLayout'), 'NoJokeSelected')
const JokePage = named(() => import('./features/jokes/JokePage'), 'JokePage')
const RewritePage = named(() => import('./features/jokes/RewritePage'), 'RewritePage')
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
const TrashPage = named(() => import('./features/trash/TrashPage'), 'TrashPage')
const ImportPage = named(() => import('./features/import/ImportPage'), 'ImportPage')

const full = (el: React.ReactNode) => <RequireAuth>{el}</RequireAuth>

/** /bits/… from before jokes were renamed: the same page under /jokes, filters and all. */
function OldJokesAddress() {
  const { pathname, search, hash } = useLocation()
  return <Navigate to={pathname.replace(/^\/bits/, '/jokes') + search + hash} replace />
}

export function App() {
  return (
    <Suspense fallback={<div className="p-8"><Spinner /></div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={full(<AppShell />)}>
          <Route index element={<TodayPage />} />
          <Route path="jokes" element={<JokesLayout />}>
            <Route index element={<NoJokeSelected />} />
            <Route path=":jokeId" element={<JokePage />} />
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
          <Route path="trash" element={<TrashPage />} />
          <Route path="import" element={<ImportPage />} />
        </Route>
        {/* Full-screen modes without the app frame. */}
        <Route path="/brainstorm/:sessionId" element={full(<SessionPage />)} />
        <Route path="/jokes/:jokeId/rewrite" element={full(<RewritePage />)} />
        <Route path="/sets/:setId/stage" element={full(<StageView />)} />
        <Route path="/sets/:setId/print" element={full(<PrintView />)} />
        {/* Old addresses from the first version. */}
        <Route path="/bits/*" element={<OldJokesAddress />} />
        <Route path="/studio/*" element={<Navigate to="/jokes" replace />} />
        <Route path="/setlist/*" element={<Navigate to="/sets" replace />} />
        <Route path="/performance" element={<Navigate to="/shows" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
