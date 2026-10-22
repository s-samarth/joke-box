/**
 * The fastest way in: the premise, and the punch if you have it. Enter saves it to Thoughts.
 * Both fields sit in one box so it reads as one joke, not a form.
 */
import { CornerDownLeft } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { THOUGHTS } from '../../lib/jokeMeta'
import { useCaptureJoke } from '../capture/newJoke'

const field = 'block w-full resize-none bg-transparent px-4 text-xl leading-snug outline-none placeholder:text-faint'

export function QuickCapture() {
  const [setup, setSetup] = useState('')
  const [punchline, setPunchline] = useState('')
  const capture = useCaptureJoke()
  const save = () => {
    if (!capture({ setup, punchline })) return
    setSetup('')
    setPunchline('')
    document.getElementById('quick-capture')?.focus()
  }
  const enterSaves = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      save()
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save() }}>
      {/* focus-within: the ring lights up when either field inside has focus. */}
      <div className="relative rounded-xl bg-ink-2 ring-1 ring-rule-strong transition focus-within:ring-2 focus-within:ring-tape">
        <label htmlFor="quick-capture" className="sr-only">Premise</label>
        <textarea id="quick-capture" rows={2} value={setup} onChange={(e) => setSetup(e.target.value)} onKeyDown={enterSaves}
          placeholder="What's the premise?" className={`${field} pt-4 pb-2 text-paper`} />
        <div className="mx-4 h-px bg-rule" />
        <label htmlFor="quick-capture-punch" className="sr-only">Punchline (optional)</label>
        <textarea id="quick-capture-punch" rows={1} value={punchline} onChange={(e) => setPunchline(e.target.value)} onKeyDown={enterSaves}
          placeholder="And the punch? (optional)" className={`${field} pt-2 pr-16 pb-4 text-tape`} />
        <button type="submit" disabled={!setup.trim()} aria-label={`Save to ${THOUGHTS}`} className="absolute right-3 bottom-3 inline-flex size-10 items-center justify-center rounded-lg bg-tape text-tape-ink transition disabled:bg-ink-4 disabled:text-faint">
          <CornerDownLeft size={18} />
        </button>
      </div>
      <p className="mt-2 text-sm text-faint">Enter saves to {THOUGHTS}. Shift+Enter for a new line.</p>
    </form>
  )
}
