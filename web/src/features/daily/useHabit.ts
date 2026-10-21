/** The daily joke habit, worked out from the cached jokes list, so it updates the moment you save one. */
import { useMemo } from 'react'
import { useBits } from '../../api/library'
import { useToday } from '../../lib/useToday'
import { habit, jokesByDay } from './dailyMath'

export function useHabit() {
  const { data: bits, isPending } = useBits()
  const today = useToday()
  return useMemo(() => {
    const days = jokesByDay(bits ?? [])
    return { days, today, habit: habit(days.keys(), today), loading: isPending }
  }, [bits, today, isPending])
}
