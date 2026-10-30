/**
 * The "New joke" sheet, reachable from the + button anywhere (and from an observation, to
 * turn it into a joke). The sheet itself lives in NewJokeForm; this only opens and closes it.
 * Opened plainly while the Jokes list is filtered to a topic (and subtopic), the joke starts there;
 * filtered to a premise, or on a premise's page, it rests on that premise.
 */
import { useState, type ReactNode } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { NO_PREMISE } from '../../lib/premises'
import { CaptureContext } from './captureContext'
import { NewJokeForm, type Prefill } from './NewJokeForm'

export function CaptureProvider({ children }: { children: ReactNode }) {
  // null = closed. Each open mounts a fresh form, so a new joke never starts with old text.
  const [prefill, setPrefill] = useState<Prefill | null>(null)
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const here = (): Prefill => {
    if (!pathname.startsWith('/jokes')) return {}
    const onPage = /^\/jokes\/premises\/([^/]+)/.exec(pathname)?.[1]
    const filtered = params.get('premise')
    const premiseId = onPage ?? (filtered && filtered !== NO_PREMISE ? filtered : null)
    return { topicId: params.get('topic') ?? undefined, subtopicId: params.get('sub'), premiseId }
  }

  return (
    <CaptureContext.Provider value={{ openCapture: (p) => setPrefill(p ?? here()) }}>
      {children}
      {prefill && <NewJokeForm prefill={prefill} onClose={() => setPrefill(null)} />}
    </CaptureContext.Provider>
  )
}
