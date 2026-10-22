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

/** A joke type and the colour of its dot. */
export interface JokeTypeInfo extends Named {
  color: string
}

/** A venue, with how many shows and sets use it. */
export interface Venue extends Named {
  shows: number
  sets: number
}

/** What the editor sends. Types and status are names; the server creates new ones. */
export interface JokeInput {
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
  /** The joke this one continues from. Many jokes can follow one, so chains branch. */
  follows_id: string | null
  /** Sent when creating, so something written offline keeps the time it was written. */
  created_at?: string
}

export interface Joke extends JokeInput {
  id: string
  /** Up by one on every save. A save says which version it was edited from (see saveJokeKey). */
  version: number
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
  joke_id: string
  title: string
  content: string
  timer_seconds: number
  versions: BrainstormVersion[]
  created_at: string
  updated_at: string
}

export interface SetlistItem {
  joke_id: string
  position: number
  duration_seconds: number
  /** One to cut if time is short: it doesn't count towards the slot. */
  optional: boolean
}

export interface Setlist {
  id: string
  name: string
  show_date: string | null
  target_seconds: number
  venue_name: string | null
  /** 1-5 stars, or null until rated. */
  rating: number | null
  tag_ids: string[]
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
  /** Sent when creating, so something written offline keeps the time it was written. */
  created_at?: string
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
  joke_ids: string[]
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
  /** Sent when creating, so something written offline keeps the time it was written. */
  created_at?: string
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

// Study and craft shapes live in their own file; re-exported so every import stays `./types`.
export * from './studyTypes'
