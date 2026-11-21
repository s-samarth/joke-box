/**
 * Streak milestones: 7, 30, 60, 90 and 180 days, a year, then every year after. Reaching one
 * earns a short confetti burst and a toast (MilestoneWatcher). Each milestone celebrates once per
 * streak, remembered on this device; a new streak earns them again.
 */
import { shiftDay, type Habit } from './dailyMath'

export type StreakKind = 'joke' | 'stage'

const YEAR = 365
const EARLY = [7, 30, 60, 90, 180]

/** The biggest milestone at or under `days`, or null below a week. */
export function milestoneFor(days: number): number | null {
  if (days >= YEAR) return Math.floor(days / YEAR) * YEAR
  return [...EARLY].reverse().find((m) => days >= m) ?? null
}

/** The first day of the current streak, or null when there isn't one. It ends today, or yesterday while today is still open. */
export function streakStart({ current, gap }: Pick<Habit, 'current' | 'gap'>, today: string): string | null {
  if (!current || gap === null || gap > 1) return null
  return shiftDay(today, -(gap + current - 1))
}

/** What this device last celebrated for a kind: which streak (by its first day) and the milestone. */
export interface Celebrated {
  start: string
  milestone: number
}

/** The milestone to celebrate now, or null: one this streak reached and hasn't celebrated yet. */
export function dueMilestone(current: number, start: string, seen: Celebrated | null): number | null {
  const milestone = milestoneFor(current)
  if (!milestone) return null
  return seen?.start === start && seen.milestone >= milestone ? null : milestone
}

const NOUN: Record<StreakKind, string> = { joke: 'jokes', stage: 'mics' }

/** "30-day stage streak. A month of mics!", "2-year joke streak. 2 years straight!" */
export function milestoneMessage(kind: StreakKind, milestone: number): string {
  const years = milestone / YEAR
  const length = milestone >= YEAR ? `${years}-year` : `${milestone}-day`
  const cheer = milestone === 7 ? `A week of ${NOUN[kind]}!`
    : milestone === 30 ? `A month of ${NOUN[kind]}!`
      : milestone === 60 ? 'Two months straight!'
        : milestone === 90 ? 'Three months straight!'
          : milestone === 180 ? 'Half a year straight!'
            : years === 1 ? `A whole year of ${NOUN[kind]}!` : `${years} years straight!`
  return `${length} ${kind} streak. ${cheer}`
}
