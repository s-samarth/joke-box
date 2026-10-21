/** Small pure helpers for voice notes: recording format, search, and storage use. */
import type { VoiceNote } from '../../api/types'

/**
 * Formats to try, best first. WebM/Opus is what Chrome, Edge and Firefox have recorded reliably
 * for years (their MP4 recording is new, and gave empty files on some Macs). Safari records MP4.
 * Current Safari, iPhone included, plays both.
 */
export const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/ogg;codecs=opus']

export const pickMimeType = (isSupported: (type: string) => boolean, avoid: string[] = []): string | undefined =>
  MIME_CANDIDATES.find((type) => isSupported(type) && !avoid.includes(baseType(type)))

/** "audio/mp4;codecs=mp4a.40.2" -> "audio/mp4" */
export const baseType = (type: string): string => type.split(';')[0].trim().toLowerCase()

/**
 * Asked of the browser, per format. Opus sounds clean at 48 kbps; AAC (what iPhones record)
 * needs more, and at 32 kbps it came out swishy. With the 4 MB cap that's ~11 minutes of Opus
 * or ~8 of AAC per note.
 */
export const bitrateFor = (mimeType: string | undefined): number => (mimeType?.includes('mp4') ? 64_000 : 48_000)

/**
 * The raw microphone, like a voice memo app. The browser's call processing (noise suppression,
 * echo cancellation, auto gain) is built for calls: auto gain turns the room hiss up whenever
 * you pause, and noise suppression makes voices warble. Nothing plays while you record, so
 * there's no echo to cancel.
 */
export const MIC_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
}

/** The server takes up to 4 MiB per note; recording stops a little before that. */
export const MAX_RECORDING_BYTES = 4_000_000

/** Vercel Blob's free storage. Shown as a bar so you see the limit coming. */
export const FREE_STORAGE_BYTES = 1_000_000_000

export const WARN_AT = 0.8

/** Notes whose label or hashtags contain every word of the search. */
export function filterNotes<T extends Pick<VoiceNote, 'label' | 'hashtags'>>(notes: T[], query: string): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return notes
  return notes.filter((n) => {
    const text = `${n.label} ${n.hashtags.join(' ')}`.toLowerCase()
    return words.every((w) => text.includes(w))
  })
}

/** Every hashtag in use, most used first. */
export function hashtagCounts(notes: Pick<VoiceNote, 'hashtags'>[]): [string, number][] {
  const counts = new Map<string, number>()
  for (const n of notes) for (const t of n.hashtags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

export function megabytes(bytes: number): string {
  const mb = bytes / 1_000_000
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`
}

/*
 * Formats that produced an empty recording in this browser. Some browsers say they can record
 * MP4 and then hand back nothing; we remember that and use the next format from then on.
 */
const AVOID_KEY = 'jokebox.voice.avoidTypes'

export function avoidedTypes(): string[] {
  try {
    return JSON.parse(localStorage.getItem(AVOID_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

export function avoidType(type: string): void {
  try {
    localStorage.setItem(AVOID_KEY, JSON.stringify([...new Set([...avoidedTypes(), baseType(type)])]))
  } catch {
    // storage blocked: we'll just try the same format again
  }
}
