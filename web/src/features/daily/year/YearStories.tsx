/**
 * A year's cards, full screen, one at a time (like Instagram or Spotify Wrapped stories): bars
 * along the top for where you are, tap the right of a card (or →) for the next and the left (or
 * ←) for the one before; past the last card it closes. The tap areas stay out of the Tab
 * order (the arrow keys do their job), so focus starts on Close. Full screen on a phone, a tall
 * card in the middle on an iPad or laptop. Radix Dialog keeps focus in it and closes it on Escape.
 */
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useState } from 'react'
import type { Story, Tone } from './storyCards'

const TONES: Record<Tone, string> = {
  ink: 'bg-ink text-paper ring-1 ring-rule',
  raised: 'bg-ink-2 text-paper',
  tape: 'bg-tape text-tape-ink',
}

export function YearStories({ title, stories, onClose }: { title: string; stories: Story[]; onClose: () => void }) {
  const [at, setAt] = useState(0)
  const story = stories[at]
  const next = () => (at + 1 < stories.length ? setAt(at + 1) : onClose())
  const back = () => setAt(Math.max(0, at - 1))
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') next()
    if (e.key === 'ArrowLeft') back()
  }
  const bar = story.tone === 'tape' ? 'bg-tape-ink' : 'bg-paper'

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/85" />
        <Dialog.Content onKeyDown={onKey} aria-describedby={undefined}
          className="fixed inset-0 z-50 flex items-center justify-center outline-none sm:p-6">
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <div className={`relative flex h-dvh w-full flex-col overflow-hidden px-6 pt-safe pb-safe sm:aspect-[9/16] sm:h-[min(88dvh,780px)] sm:w-auto sm:rounded-3xl ${TONES[story.tone]}`}>
            <div className="mt-4 flex gap-1" aria-hidden>
              {stories.map((s, i) => <span key={s.key} className={`h-[3px] flex-1 rounded-full ${bar} ${i <= at ? 'opacity-100' : 'opacity-25'}`} />)}
            </div>
            <p className="sr-only" aria-live="polite">Card {at + 1} of {stories.length}</p>
            <div className="flex min-h-0 flex-1 flex-col pb-8">{story.body}</div>
            <button type="button" tabIndex={-1} aria-label="Previous card" onClick={back} className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize outline-none" />
            <button type="button" tabIndex={-1} aria-label={at + 1 < stories.length ? 'Next card' : 'Close'} onClick={next} className="absolute inset-y-0 right-0 w-2/3 cursor-e-resize outline-none" />
            <Dialog.Close className="absolute top-8 right-3 z-10 inline-flex size-11 items-center justify-center rounded-full opacity-80 hover:opacity-100" aria-label="Close">
              <X size={22} />
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
