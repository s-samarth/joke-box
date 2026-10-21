/**
 * Today's date in IST ("YYYY-MM-DD"), kept current: it re-checks every minute and whenever the
 * app comes back into view, so a phone left open overnight rolls into the new day at midnight IST.
 */
import { useEffect, useState } from 'react'
import { todayIst } from './time'

export function useToday(): string {
  const [today, setToday] = useState(todayIst)
  useEffect(() => {
    const check = () => setToday(todayIst())
    const timer = window.setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])
  return today
}
