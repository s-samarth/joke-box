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
  created_at: string
}
