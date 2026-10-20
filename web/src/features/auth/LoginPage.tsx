/** Sign in with Google. Only allowlisted accounts get in. */
import { Navigate, useSearchParams } from 'react-router'
import { useMe } from '../../api/library'

const ERRORS: Record<string, string> = {
  not_invited: 'This vault is invite-only, and that Google account isn’t on the list.',
  failed: 'Google sign-in didn’t complete. Please try again.',
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.24 1.4-1.64 4.1-5.4 4.1-3.25 0-5.9-2.69-5.9-6s2.65-6 5.9-6c1.85 0 3.09.79 3.8 1.47l2.59-2.5C16.73 3.6 14.6 2.6 12 2.6 6.82 2.6 2.6 6.82 2.6 12s4.22 9.4 9.4 9.4c5.43 0 9.02-3.81 9.02-9.19 0-.62-.07-1.09-.15-1.56H12z" />
    </svg>
  )
}

export function LoginPage() {
  const [params] = useSearchParams()
  const { data: me } = useMe()
  if (me) return <Navigate to="/" replace />
  const error = ERRORS[params.get('error') ?? '']
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1'

  return (
    <div className="pt-safe pb-safe relative flex min-h-dvh items-center justify-center overflow-hidden px-6">
      {/* A single soft spotlight: the stage, without the old glow overload. */}
      <div className="pointer-events-none absolute top-[-20%] left-1/2 h-[70vh] w-[90vw] max-w-3xl -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative w-full max-w-sm space-y-10 text-center">
        <div className="space-y-4">
          <img src="/favicon.svg" alt="" className="mx-auto size-16 rounded-2xl ring-1 ring-line-strong" />
          <h1 className="font-display text-4xl font-bold tracking-tight">JokeBox</h1>
          <p className="text-muted">Your bits, sets and mics, in one private vault.</p>
        </div>
        <div className="space-y-3">
          <a href="/auth/google/login" className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-text font-semibold text-black transition hover:bg-white">
            <GoogleMark /> Continue with Google
          </a>
          {isLocal && (
            <a href="/auth/dev-login" className="block text-sm text-faint underline-offset-4 hover:text-muted hover:underline">
              Local dev sign-in
            </a>
          )}
          {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger ring-1 ring-danger/20" role="alert">{error}</p>}
        </div>
        <p className="text-xs text-faint">Private by design. Only invited comics can sign in.</p>
      </div>
    </div>
  )
}
