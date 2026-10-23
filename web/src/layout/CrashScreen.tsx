/**
 * What you see if the app crashes, instead of a blank screen.
 *
 * Pattern: an error boundary. When a component throws while rendering, React unmounts the whole
 * tree, which is the blank screen. A boundary is a component that catches that error and shows
 * something else in its place. React only offers this to class components
 * (getDerivedStateFromError), so it's the one class in the app.
 *
 * An old copy of the app asking for a file a new release replaced repairs itself once without
 * asking (lib/recover.ts). Anything else gets this screen: Reload, a fresh copy, and the details
 * to send.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { freshCopy, repairIfStale } from '../lib/recover'

interface State {
  error: Error | null
  repairing: boolean
}

const button = 'h-11 rounded-lg px-5 font-semibold'

export class CrashScreen extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, repairing: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('JokeBox crashed', error, info.componentStack)
    if (repairIfStale(error)) this.setState({ repairing: true })
  }

  private copy = () => {
    const { error } = this.state
    const details = [`${error?.name}: ${error?.message}`, error?.stack, `At ${location.pathname}, ${new Date().toISOString()}`, navigator.userAgent].join('\n\n')
    void navigator.clipboard?.writeText(details).catch(() => {})
  }

  render() {
    const { error, repairing } = this.state
    if (!error) return this.props.children
    if (repairing) {
      return <div className="pt-safe flex min-h-dvh items-center justify-center px-6 text-dim">Updating JokeBox…</div>
    }
    return (
      <div className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
        <p className="headline text-4xl">Something broke</p>
        <p className="text-dim">JokeBox hit an error and stopped. Saves waiting on this phone are kept, and Reload usually fixes it.</p>
        <button type="button" onClick={() => location.reload()} className={`${button} bg-tape text-tape-ink hover:bg-[#f5da77]`}>Reload</button>
        <button type="button" onClick={() => void freshCopy()} className={`${button} bg-ink-3 text-paper hover:bg-ink-4`}>Reload a fresh copy</button>
        <p className="text-sm text-faint">A fresh copy downloads the app again and reloads your lists from the server. Saves waiting to sync stay. Needs a signal.</p>
        <details className="rounded-lg bg-ink-2 px-4 py-3 text-sm ring-1 ring-rule">
          <summary className="cursor-pointer text-dim">What went wrong</summary>
          <p className="mt-2 break-words text-paper/85">{error.name}: {error.message}</p>
          <button type="button" onClick={this.copy} className="mt-3 text-tape hover:underline">Copy the details</button>
        </details>
      </div>
    )
  }
}
