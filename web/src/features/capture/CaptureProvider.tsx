/**
 * The "New joke" sheet, reachable from the + button anywhere (and from an observation, to
 * turn it into a joke). The sheet itself lives in NewJokeForm; this only opens and closes it.
 */
import { useState, type ReactNode } from 'react'
import { CaptureContext } from './captureContext'
import { NewJokeForm, type Prefill } from './NewJokeForm'

export function CaptureProvider({ children }: { children: ReactNode }) {
  // null = closed. Each open mounts a fresh form, so a new joke never starts with old text.
  const [prefill, setPrefill] = useState<Prefill | null>(null)

  return (
    <CaptureContext.Provider value={{ openCapture: (p = {}) => setPrefill(p) }}>
      {children}
      {prefill && <NewJokeForm prefill={prefill} onClose={() => setPrefill(null)} />}
    </CaptureContext.Provider>
  )
}
