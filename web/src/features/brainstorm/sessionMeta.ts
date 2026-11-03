/** How a session is named and summed up in lists. */
import type { SessionSummary } from '../../api/types'

export function sessionName(s: SessionSummary): string {
  const firstLine = s.content.trim().split('\n')[0]
  return s.title.trim() || firstLine || (s.ink_strokes ? 'Handwritten page' : 'Untitled session')
}

export function sessionSummary(s: SessionSummary): string {
  const words = s.content.trim() ? s.content.trim().split(/\s+/).length : 0
  const links = s.joke_ids.length + s.observation_ids.length
  return [
    words ? `${words} words` : null,
    s.ink_strokes ? ((s.ink_pages ?? 1) > 1 ? `${s.ink_pages} handwritten pages` : 'handwriting') : null,
    links ? `${links} linked` : null,
  ].filter(Boolean).join(', ')
}
