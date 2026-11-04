/** Logged shows, and the jokes done at each (see app/schemas/shows.py). */

/** How a joke went at a show. */
export type ShowResult = 'bombed' | 'ok' | 'killed'

/** One joke done at a show; `result` is null when it wasn't rated. */
export interface LogJoke {
  joke_id: string
  result: ShowResult | null
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
  /** The jokes done, in running order. Missing on a show cached by an app version from before. */
  jokes?: LogJoke[]
  created_at: string
}
