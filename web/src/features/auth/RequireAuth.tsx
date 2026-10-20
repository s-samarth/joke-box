/** Gate for signed-in screens. Uses the cached profile when offline, so the app still opens. */
import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { ApiError } from '../../api/client'
import { useMe } from '../../api/library'
import { Spinner } from '../../components/ui/bits'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data, error, isPending } = useMe()
  if (data) return <>{children}</>
  if (error instanceof ApiError && error.status === 401) return <Navigate to="/login" replace />
  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Opening JokeBox…" />
      </div>
    )
  }
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="headline text-3xl">Can’t reach JokeBox</p>
      <p className="text-dim">Check your connection, then try again.</p>
      <button type="button" className="text-tape" onClick={() => location.reload()}>Retry</button>
    </div>
  )
}
