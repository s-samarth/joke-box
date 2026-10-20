/** Dates are stored in UTC and always shown in India time (IST), like the original app. */

const IST = 'Asia/Kolkata'

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const timeFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST,
  hour: 'numeric',
  minute: '2-digit',
})

export const formatDate = (iso: string): string => dateFmt.format(new Date(iso))
export const formatTime = (iso: string): string => timeFmt.format(new Date(iso))
export const formatDateTime = (iso: string): string => `${formatDate(iso)}, ${formatTime(iso)}`

/** ISO instant -> "2026-10-01T20:30" in IST, for <input type="datetime-local">. */
export function toIstInput(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/** "2026-10-01T20:30" typed in IST -> ISO instant with the +05:30 offset. */
export const fromIstInput = (value: string): string => `${value}:00+05:30`

/** Today's date in IST as "YYYY-MM-DD". */
export const todayIst = (): string => toIstInput(new Date().toISOString()).slice(0, 10)
