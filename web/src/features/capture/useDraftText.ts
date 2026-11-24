import { useState } from 'react'
import { draftKey, readText, writeText } from './deviceDraft'

/** Save on each keystroke so even an immediate reload keeps the latest words. */
export function useDraftText(slot: string) {
  const [key] = useState(() => draftKey(slot))
  const [text, setText] = useState(() => readText(key))
  return [text, (value: string) => { writeText(key, value); setText(value) }] as const
}
