import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { CACHE_BUSTER, persister, persistMaxAge, queryClient, resumeQueued } from './api/queryClient'
// Registers the remaining queued saves (shows, sets, study, craft, voice) before they're replayed.
import './api/showSaves'
import './api/study'
import './api/craft'
import './api/voice'
import { checkAccount } from './api/session'
import { QUEUED } from './api/sync'
import { App } from './App'
import { FeedbackProvider } from './components/ui/feedback'
import './app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister, maxAge: persistMaxAge, buster: CACHE_BUSTER,
        // Keep every queued save that hasn't finished, not only the paused ones: a save on its way
        // when the app is closed may never have arrived, so it's sent again next time.
        dehydrateOptions: { shouldDehydrateMutation: (m) => m.state.status === 'pending' && m.options.scope?.id === QUEUED.scope.id },
      }}
      // After the saved cache loads, check who's signed in, replay the saves waiting on the phone,
      // then refresh.
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
