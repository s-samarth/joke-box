/**
 * An import bundle: a folder holding `import.json` and an `audio/` folder, made on a laptop from
 * an export such as a WhatsApp chat, or from notes on doing stand-up. Pure helpers: read the JSON, then work out what's new.
 *
 * Every item carries a fixed id, so importing the same bundle twice adds nothing the second time.
 */
import type { CraftKind } from '../../api/types'

export interface ImportJoke {
  id: string
  setup: string
  punchline?: string
  /** A joke topic by name. Missing or null files it under Thoughts. */
  topic?: string | null
  /** Joke types by name, made if new (e.g. "To review" to flag imported jokes). */
  types?: string[]
  hashtags?: string[]
  language?: string | null
  created_at: string
}

export interface ImportObservation {
  id: string
  text: string
  /** An observation topic by name, made if it doesn't exist yet. */
  topic?: string | null
  created_at: string
}

export interface ImportVoiceNote {
  id: string
  label: string
  hashtags: string[]
  duration_seconds: number
  created_at: string
  /** The audio file's name inside the bundle's audio/ folder. */
  file: string
}

export interface ImportCraftNote {
  id: string
  title: string
  body: string
  kind: CraftKind
  /** A craft area by name, made if it doesn't exist yet. */
  area: string
  hashtags?: string[]
  source?: string
  url?: string
  created_at: string
}

export interface ImportBundle {
  source: string
  jokes: ImportJoke[]
  observations: ImportObservation[]
  voice_notes: ImportVoiceNote[]
  /** Optional: older bundles don't have it. */
  craft_notes: ImportCraftNote[]
}

/** What's already in JokeBox, to skip items imported before (or typed in by hand). */
export interface Existing {
  ids: Set<string>
  jokeSetups: Set<string>
  observationTexts: Set<string>
  craftTitles: Set<string>
}

export interface ImportPlan {
  jokes: ImportJoke[]
  observations: ImportObservation[]
  voiceNotes: ImportVoiceNote[]
  craftNotes: ImportCraftNote[]
  skipped: number
}

/** Compare text loosely: case, spacing and punctuation at the ends don't count. */
export const normalise = (text: string): string =>
  text.toLowerCase().replace(/\s+/g, ' ').replace(/^[\s.,!?…-]+|[\s.,!?…-]+$/g, '')

const isList = (value: unknown): value is unknown[] => Array.isArray(value)

/** Read `import.json`, failing with a sentence a person can act on. */
export function parseBundle(json: string): ImportBundle {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('import.json is not valid JSON.')
  }
  const b = data as Partial<ImportBundle>
  if (!b || typeof b !== 'object' || !isList(b.jokes) || !isList(b.observations) || !isList(b.voice_notes)) {
    throw new Error('import.json needs jokes, observations and voice_notes lists.')
  }
  const craft = isList(b.craft_notes) ? b.craft_notes : []
  return { source: String(b.source ?? 'import'), jokes: b.jokes, observations: b.observations, voice_notes: b.voice_notes, craft_notes: craft }
}

/** Everything in the bundle that JokeBox doesn't have yet. */
export function planImport(bundle: ImportBundle, existing: Existing): ImportPlan {
  const total = bundle.jokes.length + bundle.observations.length + bundle.voice_notes.length + bundle.craft_notes.length
  const jokes = bundle.jokes.filter((j) => !existing.ids.has(j.id) && !existing.jokeSetups.has(normalise(j.setup)))
  const observations = bundle.observations.filter(
    (o) => !existing.ids.has(o.id) && !existing.observationTexts.has(normalise(o.text)),
  )
  const voiceNotes = bundle.voice_notes.filter((n) => !existing.ids.has(n.id))
  const craftNotes = bundle.craft_notes.filter((n) => !existing.ids.has(n.id) && !existing.craftTitles.has(normalise(n.title)))
  const kept = jokes.length + observations.length + voiceNotes.length + craftNotes.length
  return { jokes, observations, voiceNotes, craftNotes, skipped: total - kept }
}

/** Topic names the plan uses, without repeats (case-insensitive), in first-seen order. */
export function topicNames(items: { topic?: string | null }[]): string[] {
  const seen = new Map<string, string>()
  for (const { topic } of items) {
    const name = topic?.trim()
    if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name)
  }
  return [...seen.values()]
}
