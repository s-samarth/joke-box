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
  /** The premise it rests on, from any topic. */
  premise_id: string | null
  types: string[]
  status: string | null
  strength: number | null // null: not rated yet
  duration_seconds: number
  hashtags: string[]
  tag_lines: string[]
  /** Other punchlines for the same setup. Optional like voice_note_ids: left out, they're kept. */
  alt_punchlines?: string[]
  clean_rating: CleanRating | null
  language: string | null
  comments: string
  /** The joke this one continues from. Many jokes can follow one, so chains branch. */
  follows_id: string | null
  /**
   * The voice notes it came from. Optional: a joke cached before these existed has none, and a
   * save without the field keeps what the server has.
   */
  voice_note_ids?: string[]
  /** Sent when creating, so something written offline keeps the time it was written. */
  created_at?: string
  /** The version this edit was made from (toInput keeps it): the base of the clash check. */
  version?: number
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
  /** Up by one per save on the server; catches edits made on two devices. */
  version: number
  created_at: string
  updated_at: string
}

export interface ObservationInput {
  text: string
  /** Notes: anything more about it. Left out of a save, it stays as stored; older copies lack it. */
  extra_notes?: string
  /** What sort of note it is ("Set ideas"); null for a plain observation. */
  kind_id: string | null
  /** A joke topic, the same list jokes and premises use; null until it's sorted. */
  topic_id: string | null
  /** Sent when creating, so something written offline keeps the time it was written. */
  created_at?: string
  /** The version this edit started from, sent as the base of the save. Missing: a new one. */
  version?: number
}

/** Something you noticed: not a joke yet. */
export interface Observation extends ObservationInput {
  id: string
  /** What came from it, linked by the app (see useLinkObservation). Not sent with a save. */
  premise_ids: string[]
  joke_ids: string[]
  /** Up by one per save on the server; catches edits made on two devices. */
  version: number
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
  /** The version the editor opened, sent as the base of the save. 0 or missing: not saved yet. */
  version?: number
}

export interface WritingSession extends WritingSessionInput {
  id: string
  created_at: string
  updated_at: string
}

/** A session as the list sends it: without its ink, which comes one session at a time. */
export interface SessionSummary extends Omit<WritingSession, 'ink'> {
  ink_strokes: number
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
export * from './showTypes'
export * from './studyTypes'
