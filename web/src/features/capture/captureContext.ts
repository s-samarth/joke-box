import { createContext, useContext } from 'react'
import type { Prefill } from './NewJokeForm'

export interface CaptureApi {
  /**
   * Open the new joke sheet, optionally filed under a topic, started from some text and hashtags,
   * or following a joke. `onCreated` gets the new joke's id once it's saved.
   */
  openCapture: (prefill?: Prefill) => void
}

export const CaptureContext = createContext<CaptureApi | null>(null)

export function useCapture(): CaptureApi {
  const value = useContext(CaptureContext)
  if (!value) throw new Error('useCapture must be used inside CaptureProvider')
  return value
}
