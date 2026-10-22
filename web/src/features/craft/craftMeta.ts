/** Pure helpers for craft notes: kinds, area colours, grouping, search and new-note defaults. */
import type { AreaColor, Behaviour, CraftArea, CraftNote, CraftNoteInput, CraftScreen, NoteKind } from '../../api/types'

/** How a kind of note can behave. Kinds are yours; these four behaviours are what the app knows. */
export const BEHAVIOURS: { key: Behaviour; label: string; hint: string }[] = [
  { key: 'reference', label: 'A note to read', hint: 'Shows the start of the text' },
  { key: 'checklist', label: 'A checklist', hint: 'Ticks through on Rewrite, the set builder and Stage' },
  { key: 'technique', label: 'A writing technique', hint: 'Starts a brainstorm with its prompts' },
  { key: 'path', label: 'A path', hint: 'Its tick boxes become steps on your path' },
]

/** A kind's name, by id. */
export const kindName = (kinds: NoteKind[], id: string): string => kinds.find((k) => k.id === id)?.name ?? ''

/** The first kind that behaves this way, else your first kind. */
export const kindFor = (kinds: NoteKind[], behaviour: Behaviour = 'reference'): string =>
  (kinds.find((k) => k.behaviour === behaviour) ?? kinds[0])?.id ?? ''

/** Preset area colours, picked to read on the ink background. Any hex works too. */
export const AREA_COLORS: Record<string, string> = {
  sky: '#7cc4f5', violet: '#b49cf5', emerald: '#6fd3a6', orange: '#f5a86b',
  rose: '#f58ca0', pink: '#ef8fd0', amber: '#e9b872', teal: '#6fd1d1',
  lime: '#b5d96b', indigo: '#8e9cf5', coral: '#f59a85', slate: '#a7b3c9',
}

/** The colour to paint: a preset's hex, or the hex you picked. */
export const areaColor = (color: AreaColor): string => AREA_COLORS[color] ?? (/^#[0-9a-f]{6}$/i.test(color) ? color : AREA_COLORS.sky)

/** A new area's colour: the first preset nobody uses yet, then round again. */
export function nextColor(areas: CraftArea[]): AreaColor {
  const presets = Object.keys(AREA_COLORS)
  return presets.find((c) => !areas.some((a) => a.color === c)) ?? presets[areas.length % presets.length]
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
export function notesFor(notes: CraftNote[], areas: CraftArea[], screen: CraftScreen, behaviours?: Behaviour[]): CraftNote[] {
  const shown = areas.filter((a) => a.screens.includes(screen)).map((a) => a.id)
  return notes.filter((n) => shown.includes(n.area_id) && (!behaviours || behaviours.includes(n.behaviour)))
    .sort((a, b) => shown.indexOf(a.area_id) - shown.indexOf(b.area_id) || a.position - b.position)
}

/** The area a new note from a screen goes to: the first that shows there, else your first area. */
export const areaFor = (areas: CraftArea[], screen?: CraftScreen): string =>
  (areas.find((a) => screen && a.screens.includes(screen)) ?? areas[0])?.id ?? ''

/** Where a new note is filed: its area and kind. */
export interface Filing {
  area_id: string
  kind_id: string
}

/** A blank note that sorts after everything you already have. */
export function blankNote(notes: CraftNote[], filing: Filing, patch: Partial<CraftNoteInput> = {}): CraftNoteInput {
  const position = notes.reduce((max, n) => Math.max(max, n.position), 0) + 1
  return { title: '', body: '', ...filing, hashtags: [], source: '', url: '', position, performance_log_id: null, analysis_id: null, ...patch }
}

const TITLE_MAX = 80

/** A lesson typed in one go: the first line (cut at a word) names it, the whole text is the note. */
export function lessonFrom(text: string, notes: CraftNote[], filing: Filing, patch: Partial<CraftNoteInput> = {}): CraftNoteInput {
  const clean = text.trim()
  const first = clean.split('\n')[0].trim()
  const cut = first.lastIndexOf(' ', TITLE_MAX)
  const title = first.length <= TITLE_MAX ? first : `${first.slice(0, cut > 0 ? cut : TITLE_MAX)}…`
  return blankNote(notes, filing, { title, body: clean === title ? '' : clean, ...patch })
}

/** Plain text of a body with the formatting marks taken out, for previews. */
export const plainText = (body: string): string =>
  body.split('\n')
    .filter((l) => !/^\s*(\|[\s:|-]*|-{3,}|\*{3,})\s*$/.test(l))
    .map((l) => l.replace(/^\s*(#+\s+|>\s?|[-*]\s+|\d+[.)]\s+)?(\[[ xX]\]\s+)?/, '').replace(/\s*\|\s*/g, ' · ').replace(/^ · | · $/g, '').replaceAll('**', '').trim())
    .filter(Boolean).join(' ')
