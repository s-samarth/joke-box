/**
 * The unsaved New joke, kept on this device so closing the sheet (a stray tap on the dimmed
 * area, Escape, the X) or the phone closing the app never loses what you typed. It comes back
 * the next time you open New joke from the + button.
 *
 * One slot: the sheet that started with the slot empty (or picked the draft up) owns it and
 * writes to it as you type. A sheet opened for something else (from an observation, after a
 * joke) while a draft is waiting leaves the slot alone, and asks before throwing its own text
 * away instead. Kept in localStorage, which can be blocked (private mode): then nothing is kept.
 */
import type { JokeInput } from '../../api/types'

const KEY = 'jokebox.newJokeDraft'

export interface KeptDraft {
  draft: JokeInput
  brainstorm: string
  /** The observations it came from, linked once it's saved. Missing in drafts kept before links. */
  observationIds?: string[]
}

export function keptDraft(): KeptDraft | null {
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) ?? 'null') as KeptDraft | null
    return kept && typeof kept.draft?.setup === 'string' ? kept : null
  } catch {
    return null
  }
}

export function keepDraft(kept: KeptDraft): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(kept))
  } catch {
    // storage full or blocked: the sheet still works, it just can't keep the draft
  }
}

export function forgetDraft(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nothing was kept
  }
}

/** Has anything been typed: words, alternate punches, tag lines, notes or a brainstorm. */
export const hasText = ({ draft, brainstorm }: KeptDraft): boolean =>
  [draft.setup, draft.punchline, draft.comments, brainstorm, ...draft.tag_lines, ...(draft.alt_punchlines ?? [])].some((t) => t.trim().length > 0)

export interface Start extends KeptDraft {
  observationIds: string[]
  /** Picked up a kept draft. */
  restored: boolean
  /** This sheet writes to the slot. */
  owns: boolean
}

/**
 * How a New joke sheet starts. Opened plainly (the + button) with a draft waiting, it picks the
 * draft up. Otherwise it starts from what it was opened with, and owns the slot only if it's free.
 */
export function startDraft(fresh: JokeInput, plain: boolean, kept: KeptDraft | null, observationIds: string[] = []): Start {
  if (plain && kept) return { ...kept, observationIds: kept.observationIds ?? [], restored: true, owns: true }
  return { draft: fresh, brainstorm: '', observationIds, restored: false, owns: kept === null }
}
