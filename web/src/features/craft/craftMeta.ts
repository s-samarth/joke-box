/** Pure helpers for craft notes: the fixed areas and kinds, grouping, search and new-note defaults. */
import type { CraftArea, CraftKind, CraftNote, CraftNoteInput } from '../../api/types'

/** Where in the work a note is used, in the order you'd meet them. */
export const AREAS: { key: CraftArea; label: string; hint: string }[] = [
  { key: 'writing', label: 'Writing', hint: 'Structure, setups, premises, tags, wordplay' },
  { key: 'generating', label: 'Generating', hint: 'Techniques for finding new material' },
  { key: 'rewriting', label: 'Rewriting', hint: 'Checking and tightening a joke' },
  { key: 'sets', label: 'Building a set', hint: 'Openers, running order, longer sets' },
  { key: 'stage', label: 'On stage', hint: 'Delivery, crowd work, hecklers' },
  { key: 'formats', label: 'Formats', hint: 'Topical, political and other kinds of comedy' },
  { key: 'progress', label: 'Measuring and path', hint: 'How a set did, and where you are headed' },
]

/** What a note is for. The kind decides how the app uses it. */
export const KINDS: { key: CraftKind; label: string; hint: string }[] = [
  { key: 'checklist', label: 'Checklist', hint: 'Tick through it while you work' },
  { key: 'technique', label: 'Technique', hint: 'A writing exercise to run' },
  { key: 'reference', label: 'Reference', hint: 'Something to look up' },
  { key: 'path', label: 'Path', hint: 'A goal or plan to track' },
]

export const areaLabel = (key: CraftArea): string => AREAS.find((a) => a.key === key)?.label ?? key
export const kindLabel = (key: CraftKind): string => KINDS.find((k) => k.key === key)?.label ?? key

export interface AreaGroup {
  area: (typeof AREAS)[number]
  notes: CraftNote[]
}

/** Notes grouped by area in the fixed order, leaving out empty areas. Keeps each note's order. */
export function groupByArea(notes: CraftNote[]): AreaGroup[] {
  return AREAS.map((area) => ({ area, notes: notes.filter((n) => n.area === area.key) })).filter((g) => g.notes.length > 0)
}

/** Every word must appear somewhere in the title, body, source or hashtags. */
export function matches(note: CraftNote, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const text = `${note.title} ${note.body} ${note.source} ${note.hashtags.join(' ')}`.toLowerCase()
  return words.every((w) => text.includes(w))
}

/** Notes in these areas and kinds, in area order, then each note's own order. */
export const notesFor = (notes: CraftNote[], areas: CraftArea[], kinds?: CraftKind[]): CraftNote[] =>
  notes.filter((n) => areas.includes(n.area) && (!kinds || kinds.includes(n.kind)))
    .sort((a, b) => areas.indexOf(a.area) - areas.indexOf(b.area) || a.position - b.position)

/** A blank note that sorts after everything you already have. */
export function blankNote(notes: CraftNote[], patch: Partial<CraftNoteInput> = {}): CraftNoteInput {
  const position = notes.reduce((max, n) => Math.max(max, n.position), 0) + 1
  return { title: '', body: '', kind: 'reference', area: 'writing', hashtags: [], source: '', url: '', position, ...patch }
}
