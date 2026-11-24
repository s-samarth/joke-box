import { newId } from '../../api/client'
import type { Brainstorm } from '../../api/types'
import { draftKey, readText, writeText } from '../capture/deviceDraft'

export interface RewriteText { id: string; title: string; content: string }

export function rewriteKey(joke: string, session?: string) {
  return draftKey(`rewrite.${joke}.${session ?? 'new'}`)
}

export function openRewrite(key: string | null, saved?: Brainstorm): RewriteText {
  try {
    const draft = JSON.parse(readText(key))
    if (typeof draft?.id === 'string' && typeof draft.title === 'string' && typeof draft.content === 'string' && (!saved || saved.id === draft.id)) return draft
  } catch { /* empty or unreadable slot */ }
  return { id: saved?.id ?? newId(), title: saved?.title ?? '', content: saved?.content ?? '' }
}

/** A slow save must not remove words typed after Save was pressed. */
export function forgetSavedRewrite(key: string | null, sent: RewriteText) {
  if (readText(key) === JSON.stringify(sent)) writeText(key, '')
}
