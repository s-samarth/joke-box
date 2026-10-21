import { PersistQueryClientProvider, persistQueryClientSave } from '@tanstack/react-query-persist-client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { persistOptions } from './api/persist'
import { queryClient, resumeQueued } from './api/queryClient'
// Registers the queued saves (jokes, shows, sets, study, craft, voice) before they're replayed.
import './api/bitSaves'
import './api/showSaves'
import './api/study'
import './api/craft'
import './api/voice'
import { checkAccount } from './api/session'
import { App } from './App'
import { FeedbackProvider } from './components/ui/feedback'
import { startOutbox } from './features/voice/outbox'
import { AsideScreen } from './layout/AsideScreen'
import { keepStorage } from './lib/keepStorage'
import { claim, isAside, stepAsideWhenClaimed } from './lib/oneTab'
import './app.css'

const root = createRoot(document.getElementById('root')!)

async function boot() {
  if (isAside()) return root.render(<AsideScreen />)
  // One tab at a time: another open tab saves everything and steps aside before this one loads.
  await claim()
  stepAsideWhenClaimed(() => persistQueryClientSave({ queryClient, ...persistOptions }))
  // Ask the phone not to clear our storage, where saves wait to sync.
  void keepStorage()
  void startOutbox()
  root.render(
    <StrictMode>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
        // After the saved cache loads, check who's signed in, replay the saves waiting on the
        // phone, then refresh.
        onSuccess={() => checkAccount().then(resumeQueued).then(() => queryClient.invalidateQueries())}
      >
        <BrowserRouter>
          <FeedbackProvider>
            <App />
          </FeedbackProvider>
        </BrowserRouter>
      </PersistQueryClientProvider>
    </StrictMode>,
  )
}

void boot()
