/** How the year review's cards write dates and numbers. */
import { formatDate } from '../../../lib/time'

export const date = (day: string) => formatDate(`${day}T12:00:00+05:30`)
/** "14 Aug". */
export const dayMonth = (day: string) => date(day).split(' ').slice(0, 2).join(' ')
/** "1,284", the Indian way. */
export const n = (x: number) => x.toLocaleString('en-IN')
export const PLURAL_PART: Record<string, string> = { Morning: 'mornings', Afternoon: 'afternoons', Evening: 'evenings', Night: 'nights' }
/** A set's length as m:ss. */
export const minSec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
