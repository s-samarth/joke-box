/** Pure helpers for craft notes: kinds, area colours, grouping, search and new-note defaults. */
import type { AreaColor, CraftArea, CraftKind, CraftNote, CraftNoteInput, CraftScreen } from '../../api/types'

/** What a note is for. The kind decides how the app uses it, so kinds are fixed. */
export const KINDS: { key: CraftKind; label: string; hint: string }[] = [
  { key: 'checklist', label: 'Checklist', hint: 'Tick through it while you work' },
  { key: 'technique', label: 'Technique', hint: 'A writing exercise to run' },
  { key: 'reference', label: 'Reference', hint: 'Something to look up' },
  { key: 'path', label: 'Path', hint: 'A goal or plan to track' },
]

export const kindLabel = (key: CraftKind): string => KINDS.find((k) => k.key === key)?.label ?? key

/** Area colours, picked to read on the ink background. Tape yellow stays for actions. */
export const AREA_COLORS: Record<AreaColor, string> = {
  sky: '#7cc4f5', violet: '#b49cf5', emerald: '#6fd3a6', orange: '#f5a86b',
  rose: '#f58ca0', pink: '#ef8fd0', amber: '#e9b872', teal: '#6fd1d1',
}

/** The screens an area can show on, as the area settings name them. */
export const SCREENS: { key: CraftScreen; label: string }[] = [
  { key: 'rewrite', label: 'Rewrite' },
  { key: 'sets', label: 'Set builder' },
  { key: 'stage', label: 'Stage' },
]

export interface AreaGroup {
  area: CraftArea
  notes: CraftNote[]
}

/** Notes grouped by area in your order, keeping each note's order. Empty areas stay. */
export const groupByArea = (notes: CraftNote[], areas: CraftArea[]): AreaGroup[] =>
  areas.map((area) => ({ area, notes: notes.filter((n) => n.area_id === area.id) }))

/** Every word must appear somewhere in the title, body, source or hashtags. */
export function matches(note: CraftNote, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const text = `${note.title} ${note.body} ${note.source} ${note.hashtags.join(' ')}`.toLowerCase()
  return words.every((w) => text.includes(w))
}

/** Notes from the areas that show on a screen, in area order, then each note's own order. */
export function notesFor(notes: CraftNote[], areas: CraftArea[], screen: CraftScreen, kinds?: CraftKind[]): CraftNote[] {
  const shown = areas.filter((a) => a.screens.includes(screen)).map((a) => a.id)
  return notes.filter((n) => shown.includes(n.area_id) && (!kinds || kinds.includes(n.kind)))
    .sort((a, b) => shown.indexOf(a.area_id) - shown.indexOf(b.area_id) || a.position - b.position)
}

/** The area a new note from a screen goes to: the first that shows there, else your first area. */
export const areaFor = (areas: CraftArea[], screen?: CraftScreen): string =>
  (areas.find((a) => screen && a.screens.includes(screen)) ?? areas[0])?.id ?? ''

/** A blank note that sorts after everything you already have. */
export function blankNote(notes: CraftNote[], areaId: string, patch: Partial<CraftNoteInput> = {}): CraftNoteInput {
  const position = notes.reduce((max, n) => Math.max(max, n.position), 0) + 1
  return { title: '', body: '', kind: 'reference', area_id: areaId, hashtags: [], source: '', url: '', position, performance_log_id: null, analysis_id: null, ...patch }
}

const TITLE_MAX = 80

/** A lesson typed in one go: the first line (cut at a word) names it, the whole text is the note. */
export function lessonFrom(text: string, notes: CraftNote[], areaId: string, patch: Partial<CraftNoteInput> = {}): CraftNoteInput {
  const clean = text.trim()
  const first = clean.split('\n')[0].trim()
  const cut = first.lastIndexOf(' ', TITLE_MAX)
  const title = first.length <= TITLE_MAX ? first : `${first.slice(0, cut > 0 ? cut : TITLE_MAX)}…`
  return blankNote(notes, areaId, { title, body: clean === title ? '' : clean, ...patch })
}

/** Plain text of a body with the formatting marks taken out, for previews. */
export const plainText = (body: string): string =>
  body.split('\n').map((l) => l.replace(/^\s*(#+\s+|[-*]\s+|\d+[.)]\s+)?(\[[ xX]\]\s+)?/, '').replaceAll('**', '').trim()).filter(Boolean).join(' ')
