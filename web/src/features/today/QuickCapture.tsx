/** The fastest way in: type the premise, press Enter, it's in your Inbox. */
import { CornerDownLeft } from 'lucide-react'
import { useState } from 'react'
import { useCaptureBit } from '../capture/newBit'

export function QuickCapture() {
  const [text, setText] = useState('')
  const capture = useCaptureBit()
  const save = () => {
    if (capture({ setup: text })) setText('')
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save() }}>
      <label htmlFor="quick-capture" className="sr-only">Capture a premise</label>
      <div className="relative">
      <textarea
        id="quick-capture"
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            save()
          }
        }}
        placeholder="What's the premise?"
        className="block w-full resize-none rounded-xl bg-ink-2 px-4 py-4 pr-14 text-xl leading-snug text-paper ring-1 ring-rule-strong placeholder:text-faint outline-none transition focus:ring-2 focus:ring-tape"
      />
      <button type="submit" disabled={!text.trim()} aria-label="Save to Inbox" className="absolute right-3 bottom-3 inline-flex size-10 items-center justify-center rounded-lg bg-tape text-tape-ink transition disabled:bg-ink-4 disabled:text-faint">
        <CornerDownLeft size={18} />
      </button>
      </div>
      <p className="mt-2 text-sm text-faint">Enter saves to your Inbox. Shift+Enter for a new line.</p>
    </form>
  )
}
