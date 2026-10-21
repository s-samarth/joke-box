/** Sign in with Google. Only invited accounts get in. */
import { Navigate, useSearchParams } from 'react-router'
import { ApiError } from '../../api/client'
import { useMe } from '../../api/library'
import { Tape } from '../../components/ui/bits'
import { useWaiting } from '../../layout/useWaiting'

const ERRORS: Record<string, string> = {
  not_invited: 'That Google account isn’t on the invite list. Sign in with an invited account, or ask to be added.',
  failed: 'Google sign-in didn’t finish. Try again.',
}

export function LoginPage() {
  const [params] = useSearchParams()
  const { data: me, error: meError } = useMe()
  const { count: waiting } = useWaiting()
  const signedOut = meError instanceof ApiError && meError.status === 401
  if (me && !signedOut) return <Navigate to="/" replace />
  const error = ERRORS[params.get('error') ?? '']
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname)

  return (
    <div className="pt-safe pb-safe flex min-h-dvh flex-col justify-center px-6 sm:px-12">
      <div className="mx-auto w-full max-w-md">
        <h1 className="headline text-[72px] sm:text-[96px]">JokeBox</h1>
        <div className="mt-6 space-y-3" aria-hidden>
          <Tape seed={1} className="px-4 py-2 text-xl">Write it down</Tape>
          <Tape seed={4} className="ml-6 px-4 py-2 text-xl">Tape it to the floor</Tape>
          <Tape seed={2} className="ml-2 px-4 py-2 text-xl">Kill</Tape>
        </div>
        <p className="mt-8 text-lg text-dim">Your jokes, sets and shows in one private notebook.</p>
        <a href="/auth/google/login" className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-paper font-semibold text-ink hover:bg-white">
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden><path fill="#EA4335" d="M12 10.2v3.9h5.4c-.24 1.4-1.64 4.1-5.4 4.1-3.25 0-5.9-2.69-5.9-6s2.65-6 5.9-6c1.85 0 3.09.79 3.8 1.47l2.59-2.5C16.73 3.6 14.6 2.6 12 2.6 6.82 2.6 2.6 6.82 2.6 12s4.22 9.4 9.4 9.4c5.43 0 9.02-3.81 9.02-9.19 0-.62-.07-1.09-.15-1.56H12z" /></svg>
          Sign in with Google
        </a>
        {isLocal && <a href="/auth/dev-login" className="mt-4 block text-center text-sm text-faint hover:text-dim">Sign in as the local test account</a>}
        {waiting > 0 && (
          <p className="mt-4 rounded-lg bg-amber/10 px-4 py-3 text-sm text-amber" role="status">
            {waiting === 1 ? '1 change is waiting on this phone. Sign in with the same account and it’ll sync.' : `${waiting} changes are waiting on this phone. Sign in with the same account and they’ll sync.`}
          </p>
        )}
        {error && <p className="mt-4 rounded-lg bg-light/10 px-4 py-3 text-sm text-light" role="alert">{error}</p>}
      </div>
    </div>
  )
}
