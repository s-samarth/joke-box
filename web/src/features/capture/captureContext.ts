import { createContext, useContext } from 'react'

export interface CaptureApi {
  /** Open the capture sheet, optionally filed under a topic. */
  openCapture: (prefill?: { topicId?: string; subtopicId?: string | null }) => void
}

export const CaptureContext = createContext<CaptureApi | null>(null)

export function useCapture(): CaptureApi {
  const value = useContext(CaptureContext)
  if (!value) throw new Error('useCapture must be used inside CaptureProvider')
  return value
}
