import { PersistQueryClientProvider, persistQueryClientSave } from '@tanstack/react-query-persist-client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { upgradeOldCache } from './api/legacy'
import { persistOptions } from './api/persist'
import { queryClient, resumeQueued } from './api/queryClient'
// Registers the queued saves (jokes, shows, sets, study, craft, voice, board) before they're replayed.
import './api/jokeSaves'
import './api/showSaves'
import './api/study'
import './api/craft'
import './api/voice'
import './api/trash'
import './api/board'
import './api/premises'
import { checkAccount } from './api/session'
import { App } from './App'
import { FeedbackProvider } from './components/ui/feedback'
import { startOutbox } from './features/voice/outbox'
import { AsideScreen } from './layout/AsideScreen'
import { CrashScreen } from './layout/CrashScreen'
import { keepStorage } from './lib/keepStorage'
import { claim, isAside, stepAsideWhenClaimed } from './lib/oneTab'
import { repairIfStale } from './lib/recover'
import './app.css'

const root = createRoot(document.getElementById('root')!)

// Vite reports a file it couldn't load (an old copy of the app after a release) here, before
// anything crashes: repair once instead of letting it fail.
window.addEventListener('vite:preloadError', (e) => {
  if (repairIfStale(e.payload)) e.preventDefault()
})

async function boot() {
  if (isAside()) return root.render(<AsideScreen />)
  // One tab at a time: another open tab saves everything and steps aside before this one loads
  // (unless several tabs are allowed).
  const alone = await claim()
  stepAsideWhenClaimed(() => persistQueryClientSave({ queryClient, ...persistOptions }))
  // Ask the phone not to clear our storage, where saves wait to sync.
  void keepStorage()
  void startOutbox(alone)
  root.render(
    <StrictMode>
      <CrashScreen>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={persistOptions}
          // After the saved cache loads, check who's signed in, replay the saves waiting on the
          // phone, then refresh.
          onSuccess={() => { upgradeOldCache(queryClient); return checkAccount().then(resumeQueued).then(() => queryClient.invalidateQueries()) }}
        >
          <BrowserRouter>
            <FeedbackProvider>
              <App />
            </FeedbackProvider>
          </BrowserRouter>
        </PersistQueryClientProvider>
      </CrashScreen>
    </StrictMode>,
  )
}

void boot()
