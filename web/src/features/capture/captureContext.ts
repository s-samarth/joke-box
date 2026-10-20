import { createContext, useContext } from 'react'

export interface CaptureApi {
  /** Open the new joke sheet, optionally filed under a topic or started from some text. */
  openCapture: (prefill?: { topicId?: string; subtopicId?: string | null; setup?: string }) => void
}

export const CaptureContext = createContext<CaptureApi | null>(null)

export function useCapture(): CaptureApi {
  const value = useContext(CaptureContext)
  if (!value) throw new Error('useCapture must be used inside CaptureProvider')
  return value
}
