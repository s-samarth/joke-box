/** The daily joke habit, worked out from the cached jokes list, so it updates the moment you save one. */
import { useMemo } from 'react'
import { useJokes } from '../../api/library'
import { useToday } from '../../lib/useToday'
import { habit, jokesByDay } from './dailyMath'

export function useHabit() {
  const { data: jokes, isPending } = useJokes()
  const today = useToday()
  return useMemo(() => {
    const days = jokesByDay(jokes ?? [])
    return { days, today, habit: habit(days.keys(), today), loading: isPending }
  }, [jokes, today, isPending])
}
