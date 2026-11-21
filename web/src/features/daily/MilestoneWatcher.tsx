/**
 * Celebrates streak milestones (see milestones.ts) wherever you are in the app: when a save
 * takes the joke or stage streak to 7, 30, 60, 90, 180 days or a year, or when you open the app
 * after one got there elsewhere (a show logged from set-review). A confetti burst and a toast, once
 * per milestone per streak; what's been celebrated is remembered on this device. Renders nothing.
 */
import { useEffect, useMemo } from 'react'
import { useLogs } from '../../api/shows'
import { useFeedback } from '../../components/ui/feedbackContext'
import { confetti } from '../../lib/confetti'
import { showsByDay } from '../shows/insights/timelineMath'
import { habit } from './dailyMath'
import { dueMilestone, milestoneMessage, streakStart, type Celebrated, type StreakKind } from './milestones'
import { useActivity } from './useActivity'

const KEY = (kind: StreakKind) => `jokebox.milestone.${kind}`
// The app's own colours: green for jokes with a little of everything, gold for the stage.
const COLORS: Record<StreakKind, string[]> = {
  joke: ['#74d3a8', '#f0cf5a', '#9db4ff', '#e7a3e0', '#ece6da'],
  stage: ['#f0cf5a', '#d8b744', '#ffb547', '#ece6da'],
}

function readSeen(kind: StreakKind): Celebrated | null {
  try {
    return JSON.parse(localStorage.getItem(KEY(kind)) ?? 'null') as Celebrated | null
  } catch {
    return null
  }
}

function writeSeen(kind: StreakKind, seen: Celebrated): void {
  try {
    localStorage.setItem(KEY(kind), JSON.stringify(seen))
  } catch {
    // Private mode or storage blocked: it may celebrate again, which is harmless.
  }
}

export function MilestoneWatcher() {
  const { habit: jokes, today } = useActivity()
  const { data: logs } = useLogs()
  const stage = useMemo(() => habit(showsByDay(logs ?? []).keys(), today), [logs, today])
  const { toast } = useFeedback()

  useEffect(() => {
    const streaks: [StreakKind, { current: number; gap: number | null }][] = [['joke', jokes], ['stage', stage]]
    const due = streaks.flatMap(([kind, h]) => {
      const start = streakStart(h, today)
      const milestone = start ? dueMilestone(h.current, start, readSeen(kind)) : null
      if (!start || !milestone) return []
      writeSeen(kind, { start, milestone })
      return [{ kind, milestone }]
    })
    if (!due.length) return
    confetti(due.flatMap((d) => COLORS[d.kind]))
    toast(due.map((d) => milestoneMessage(d.kind, d.milestone)).join(' '))
    // Only the numbers matter: a new list with the same streaks shouldn't re-check.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [jokes.current, jokes.gap, stage.current, stage.gap, today])

  return null
}
