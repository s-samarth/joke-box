/** The six things highlights rank months by, with their colours and how a number reads. */
import { stageTotal } from '../../shows/calendar/showMonth'
import type { Measure } from './highlightMath'

export interface MeasureMeta {
  key: Measure
  label: string
  dot: string
  text: string
  /** "38 jokes", "1h 32m". */
  say: (n: number) => string
  /** Short enough to sit over a bar: "38", "3.7h". */
  short: (n: number) => string
}

const count = (one: string, many: string) => (n: number) => `${n} ${n === 1 ? one : many}`
const plain = (n: number) => String(n)
const hours = (seconds: number) => {
  const m = Math.round(seconds / 60)
  return m < 60 ? `${m}m` : `${(m / 60).toFixed(1)}h`
}

export const MEASURES: MeasureMeta[] = [
  { key: 'jokes', label: 'Jokes', dot: 'bg-ok', text: 'text-ok', say: count('joke', 'jokes'), short: plain },
  { key: 'observations', label: 'Observations', dot: 'bg-orchid', text: 'text-orchid', say: count('observation', 'observations'), short: plain },
  { key: 'premises', label: 'Premises', dot: 'bg-sky', text: 'text-sky', say: count('premise', 'premises'), short: plain },
  { key: 'all', label: 'All writing', dot: 'bg-paper', text: 'text-paper', say: count('piece', 'pieces'), short: plain },
  { key: 'shows', label: 'Shows', dot: 'bg-tape', text: 'text-tape', say: count('show', 'shows'), short: plain },
  { key: 'stage', label: 'Stage time', dot: 'bg-tape', text: 'text-tape', say: stageTotal, short: hours },
]

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "Aug 2026". */
export const shortMonth = (month: string) => `${SHORT[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`
/** "August". */
export const longMonth = (month: string) => LONG[Number(month.slice(5)) - 1]
/** "A" for August, the chart's axis. */
export const letter = (month: string) => SHORT[Number(month.slice(5)) - 1][0]
