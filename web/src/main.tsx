import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { persister, persistMaxAge, queryClient } from './api/queryClient'
// Registers the watchlist, analysis and craft note save defaults before offline saves are replayed.
import './api/study'
import './api/craft'
import { App } from './App'
import { FeedbackProvider } from './components/ui/feedback'
import './app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: persistMaxAge, buster: 'v1' }}
      // After the saved cache loads, replay any saves that were made offline.
      onSuccess={() => queryClient.resumePausedMutations().then(() => queryClient.invalidateQueries())}
    >
      <BrowserRouter>
        <FeedbackProvider>
          <App />
        </FeedbackProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  </StrictMode>,
)
