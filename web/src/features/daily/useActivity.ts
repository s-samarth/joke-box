/**
 * The Daily activity page's data: the joke habit plus every day's premises and observations, from
 * the cached lists, so the calendar updates the moment you save anything. Used by ActivityPanel,
 * on Daily activity and Home.
 */
import { useMemo } from 'react'
import { useJokes } from '../../api/library'
import { useObservations } from '../../api/notebook'
import { usePremises } from '../../api/premises'
import { useToday } from '../../lib/useToday'
import { activityByDay } from './activity'
import { habit } from './dailyMath'

export function useActivity() {
  const { data: jokes } = useJokes()
  const { data: premises } = usePremises()
  const { data: observations } = useObservations()
  const today = useToday()
  return useMemo(() => {
    const activity = activityByDay(jokes ?? [], premises ?? [], observations ?? [])
    const jokeDays = [...activity].filter(([, d]) => d.jokes.length).map(([day]) => day)
    return { activity, today, habit: habit(jokeDays, today) }
  }, [jokes, premises, observations, today])
}
