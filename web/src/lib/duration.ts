/** Durations are stored as whole seconds and shown as "m:ss" or "Xm YYs". */

/** A new joke's runtime, and where the stepper starts on a joke with none set. */
export const DEFAULT_RUNTIME = 15

/** 150 -> "2:30" */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const rest = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${rest}` : `${m}:${rest}`
}

/** 150 -> "2m 30s", 3900 -> "1h 05m" */
export function long(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(s % 60).padStart(2, '0')}s`
}

/**
 * Read what someone typed: "2:30", "2m 30s", "90" (seconds) or "2m". Returns null if unreadable.
 */
export function parse(text: string): number | null {
  const t = text.trim().toLowerCase()
  if (!t) return 0
  let match = t.match(/^(\d+):([0-5]?\d)$/)
  if (match) return Number(match[1]) * 60 + Number(match[2])
  match = t.match(/^(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/)
  if (match && (match[1] || match[2])) return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0)
  if (/^\d+$/.test(t)) return Number(t)
  return null
}

