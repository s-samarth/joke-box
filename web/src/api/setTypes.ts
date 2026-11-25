/** Sets: beats, entries, pieces and label fields (docs/sets.md, app/schemas/set_beats.py). */

import type { PremiseStatus } from './premises'

export interface SetlistItem {
  joke_id: string
  position: number
  duration_seconds: number
  /** One to cut if time is short: it doesn't count towards the slot. */
  optional: boolean
}

/** One joke in a beat's list (docs/sets.md). */
export interface SetPiece {
  id: string
  joke_id: string
  /** A cluster's version follows the cluster's lead, unless the set pins this one. */
  cluster_id?: string | null
  pinned?: boolean
  /** Loose: keeps its place, but you can move it or drop it on the night. */
  loose: boolean
  /** A gate: if this joke doesn't land, the next `gate` jokes in the list are skipped. */
  gate: number
}

export interface SetReply { id: string; when: string; line: string }
export interface SetQuestion { id: string; text: string; has_reply: boolean; replies: SetReply[] }

export type SetEntry =
  | { kind: 'premise'; id: string; premise_id: string | null; gate: boolean; pieces: SetPiece[] }
  | { kind: 'jokes'; id: string; pieces: SetPiece[] }
  | { kind: 'crowd'; id: string; title: string; questions: SetQuestion[] }

export interface Beat {
  id: string
  cue: string
  description: string
  /** Set by hand. Joke times don't add up to it. */
  seconds: number
  /** Field id to option id; a field missing here is Not sure. */
  labels: Record<string, string>
  /** Why the status changed from the beat before; '' for none yet. */
  shift_reason: string
  entries: SetEntry[]
}

export type StatusGroup = 'win' | 'neutral' | 'loss'
/** `color` is hex; missing on one saved before colours, which then gets its default (lib/labelColors). */
export interface SetFieldOption { id: string; label: string; group?: StatusGroup | null; color?: string | null }
export interface SetField { id: string; name: string; role?: 'status' | 'persona' | null; options: SetFieldOption[] }
export interface SetFields { fields: SetField[]; top_up_seconds: number }

export interface Setlist {
  id: string
  name: string
  show_date: string | null
  target_seconds: number
  venue_name: string | null
  /** 1-5 stars, or null until rated. */
  rating: number | null
  tag_ids: string[]
  /** Worked out from the beats by the server: each joke once, in running order. */
  items: SetlistItem[]
  /** The one point the set makes. Older copies in the cache lack it. */
  point?: string
  /** Beats in running order. Older copies in the cache lack them. */
  beats?: Beat[]
  /** Draft, Work in Progress, Stage Ready or Discarded. Older copies in the cache lack it. */
  status?: PremiseStatus
  /** Up by one per save on the server; catches edits made on two devices. */
  version: number
  created_at: string
  updated_at: string
}
