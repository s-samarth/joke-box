/** Shown in a tab that stepped aside because JokeBox was opened in another one (see lib/oneTab). */
import { keepBoth, takeOver } from '../lib/oneTab'

export function AsideScreen() {
  return (
    <div className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="headline text-4xl">Open in another tab</p>
      <p className="max-w-sm text-dim">JokeBox runs in one tab at a time, so changes made offline can’t be lost between two. Everything from this tab was saved.</p>
      <button type="button" onClick={takeOver} className="h-11 rounded-lg bg-tape px-5 font-semibold text-tape-ink hover:bg-[#f5da77]">Use it here</button>
      <button type="button" onClick={keepBoth} className="h-11 rounded-lg px-5 text-dim hover:bg-ink-3 hover:text-paper">Keep both open</button>
      <p className="max-w-sm text-sm text-faint">Keep both if you won’t edit the same thing in both. You can switch it off in the account menu under Several tabs.</p>
    </div>
  )
}
