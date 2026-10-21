/** Shapes returned by the API (see app/schemas on the Python side). */

export type CleanRating = 'clean' | 'mild' | 'dirty'

export interface Me {
  id: string
  email: string
  display_name: string
  avatar_url: string
  plan: string
  env: 'local' | 'preview' | 'production'
}

export interface Subtopic {
  id: string
  name: string
}

export interface Topic {
  id: string
  name: string
  is_system: boolean
  subtopics: Subtopic[]
}

export interface Named {
  id: string
  name: string
}

/** What the editor sends. Types and status are names; the server creates new ones. */
export interface BitInput {
  setup: string
  punchline: string
  topic_id: string
  subtopic_id: string | null
  types: string[]
  status: string | null
  strength: number
  duration_seconds: number
  hashtags: string[]
  tag_lines: string[]
  clean_rating: CleanRating | null
  language: string | null
  comments: string
}

export interface Bit extends BitInput {
  id: string
  created_at: string
  updated_at: string
}

export interface BrainstormVersion {
  id: string
  title: string
  content: string
  saved_at: string
}

export interface Brainstorm {
  id: string
  bit_id: string
  title: string
  content: string
  timer_seconds: number
  versions: BrainstormVersion[]
  created_at: string
  updated_at: string
}

export interface SetlistItem {
  bit_id: string
  position: number
  duration_seconds: number
}

export interface Setlist {
  id: string
  name: string
  show_date: string | null
  target_seconds: number
  venue_name: string | null
  items: SetlistItem[]
  created_at: string
  updated_at: string
}

export interface PerformanceLog {
  id: string
  venue_name: string
  performed_at: string
  duration_seconds: number
  audience_size: number
  rating: number
  topic_ids: string[]
  notes: string
  /** Laugh tally for LPM: how many laughs scored 1 to 5 points. Null if not counted. */
  laughs: number[] | null
  created_at: string
}

export interface ObservationInput {
  text: string
  topic_id: string | null
}

/** Something you noticed: not a joke yet. Its topics are separate from joke topics. */
export interface Observation extends ObservationInput {
  id: string
  created_at: string
  updated_at: string
}

/** One pen stroke. Points are [x, y, pressure] on a page 1000 units wide. */
export interface Stroke {
  color: string
  size: number
  /** 0-based page. Strokes saved before pages existed have none and sit on the first page. */
  page?: number
  points: [number, number, number][]
}

export interface WritingSessionInput {
  title: string
  content: string
  ink: Stroke[]
  /** How many handwriting pages, including blank ones. */
  ink_pages: number
  timer_seconds: number
  bit_ids: string[]
  observation_ids: string[]
  /** The craft technique this session runs, if any. */
  technique_id: string | null
}

export interface WritingSession extends WritingSessionInput {
  id: string
  created_at: string
  updated_at: string
}

/** A voice note's details. The audio is uploaded separately and lives in Blob storage. */
export interface VoiceNoteInput {
  label: string
  hashtags: string[]
  duration_seconds: number
}

export interface VoiceNote extends VoiceNoteInput {
  id: string
  content_type: string
  size_bytes: number
  /** False until the recording has finished uploading. */
  has_audio: boolean
  created_at: string
  updated_at: string
}

/** A routine on the watchlist. Scores (0-10) come from the Relatable Schemer dossier. */
export interface WatchItemInput {
  title: string
  comedian: string
  category: string
  description: string
  url: string
  position: number
  schemer_index: number | null
  logic_density: number | null
  dark_pragmatism: number | null
  watched: boolean
}

export interface WatchItem extends WatchItemInput {
  id: string
  created_at: string
  updated_at: string
}

/** Your write-up of a set or an online bit. */
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

export type CraftKind = 'checklist' | 'technique' | 'reference' | 'path'
/** Screens that can show an area's notes in a sheet. */
export type CraftScreen = 'rewrite' | 'sets' | 'stage'
export type AreaColor = 'sky' | 'violet' | 'emerald' | 'orange' | 'rose' | 'pink' | 'amber' | 'teal'

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
  kind: CraftKind
  area_id: string
  hashtags: string[]
  source: string
  url: string
  position: number
  /** The show or analysis the lesson came from, if any. */
  performance_log_id: string | null
  analysis_id: string | null
}

export interface CraftNote extends CraftNoteInput {
  id: string
  created_at: string
  updated_at: string
}
