/**
 * The "New joke" sheet, reachable from the + button anywhere (and from an observation, to
 * turn it into a joke). The sheet itself lives in NewJokeForm; this only opens and closes it.
 * Opened plainly while the Jokes list is filtered to a topic (and subtopic), the joke starts there;
 * filtered to a premise, it rests on that premise. Opened plainly with an unsaved joke waiting
 * (see keptDraft), it picks that up instead.
 */
import { useState, type ReactNode } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { NO_PREMISE, ON_A_PREMISE } from '../../lib/premises'
import { CaptureContext } from './captureContext'
import { NewJokeForm, type Prefill } from './NewJokeForm'

export function CaptureProvider({ children }: { children: ReactNode }) {
  // null = closed. Each open mounts a fresh form; only a kept draft carries text from before.
  const [opening, setOpening] = useState<{ prefill: Prefill; plain: boolean } | null>(null)
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const here = (): Prefill => {
    if (!pathname.startsWith('/jokes')) return {}
    const filtered = params.get('premise')
    const premiseId = filtered && filtered !== NO_PREMISE && filtered !== ON_A_PREMISE ? filtered : null
    return { topicId: params.get('topic') ?? undefined, subtopicId: params.get('sub'), premiseId }
  }

  return (
    <CaptureContext.Provider value={{ openCapture: (p) => setOpening({ prefill: p ?? here(), plain: !p }) }}>
      {children}
      {opening && <NewJokeForm prefill={opening.prefill} plain={opening.plain} onClose={() => setOpening(null)} />}
    </CaptureContext.Provider>
  )
}
