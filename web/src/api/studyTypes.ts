/** Shapes for study and craft: the watchlist, analyses, and craft notes, kinds and areas. */

/** A routine on the watchlist. Its three optional scores are 0-10. */
export interface WatchItemInput {
  title: string
  comedian: string
  category: string
  description: string
  url: string
  position: number
  contrast: number | null
  logic_density: number | null
  has_a_point: number | null
  watched: boolean
}

export interface WatchItem extends WatchItemInput {
  id: string
  created_at: string
  updated_at: string
}

/** Your write-up of a set or an online joke. */
export interface AnalysisInput {
  title: string
  url: string
  body: string
  watch_item_id: string | null
}

export interface Analysis extends AnalysisInput {
  id: string
  created_at: string
  updated_at: string
}

/** How a kind of note behaves: a checklist ticks, a technique runs, a path climbs, a reference reads. */
export type Behaviour = 'checklist' | 'technique' | 'reference' | 'path'

/** A kind of craft note. Yours to name, add and delete; its behaviour is how the app uses it. */
export interface NoteKindInput {
  name: string
  behaviour: Behaviour
}

export interface NoteKind extends NoteKindInput {
  id: string
  position: number
}
/** Screens that can show an area's notes in a sheet. */
export type CraftScreen = 'rewrite' | 'sets' | 'stage'
/** A preset colour name, or any "#rrggbb". */
export type AreaColor = string

/** A folder of craft notes. Yours to add, rename, colour, reorder and delete. */
export interface CraftAreaInput {
  name: string
  description: string
  color: AreaColor
  screens: CraftScreen[]
}

export interface CraftArea extends CraftAreaInput {
  id: string
  position: number
}

/** Something you've learned about doing stand-up: a checklist, a technique, reference or a goal. */
export interface CraftNoteInput {
  title: string
  body: string
  kind_id: string
  area_id: string
  hashtags: string[]
  source: string
  url: string
  position: number
  /** The show or analysis the lesson came from, if any. */
  performance_log_id: string | null
  analysis_id: string | null
  /** Sent when creating, so something written offline keeps the time it was written. */
  created_at?: string
}

export interface CraftNote extends CraftNoteInput {
  id: string
  /** From the note's kind: how screens show it. */
  behaviour: Behaviour
  created_at: string
  updated_at: string
}
