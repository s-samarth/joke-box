/**
 * The capture sheet, reachable from the + button anywhere. Two fields and a topic; everything
 * else can wait. "Save" files it and keeps you where you were; "Add details" opens the bit.
 */
import { useState, type ReactNode } from 'react'
import { useTopics } from '../../api/library'
import { Button } from '../../components/ui/Button'
import { GrowingText } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { topicName } from '../../lib/bitMeta'
import { CaptureContext } from './captureContext'
import { useCaptureBit } from './newBit'

interface Draft {
  setup: string
  punchline: string
  topicId?: string
  subtopicId?: string | null
}

export function CaptureProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const { data: topics = [] } = useTopics()
  const capture = useCaptureBit()
  const inboxId = topics.find((t) => t.is_system)?.id
  const topicId = draft?.topicId ?? inboxId

  const submit = (open: boolean) => {
    if (!draft || !draft.setup.trim()) return
    capture({ ...draft, topicId }, { open })
    setDraft(null)
  }

  return (
    <CaptureContext.Provider value={{ openCapture: (prefill = {}) => setDraft({ setup: '', punchline: '', ...prefill }) }}>
      {children}
      <Modal
        open={draft !== null}
        onOpenChange={(o) => !o && setDraft(null)}
        title="New bit"
        footer={
          <>
            <Button variant="quiet" onClick={() => submit(true)} disabled={!draft?.setup.trim()}>Add details</Button>
            <Button variant="tape" onClick={() => submit(false)} disabled={!draft?.setup.trim()}>Save</Button>
          </>
        }
      >
        {draft && (
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(false) }}>
            <div className="space-y-3 rounded-xl bg-ink p-4 ring-1 ring-rule">
              <GrowingText autoFocus aria-label="Setup" placeholder="The premise…" className="text-xl leading-snug" value={draft.setup}
                onChange={(e) => setDraft({ ...draft, setup: e.target.value })} />
              <div className="h-px bg-rule" />
              <GrowingText aria-label="Punchline" placeholder="The punch (optional)" className="text-xl leading-snug text-tape placeholder:text-faint" value={draft.punchline}
                onChange={(e) => setDraft({ ...draft, punchline: e.target.value })} />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-dim">File under</p>
              <div className="flex flex-wrap gap-2">
                {topics.map((t) => (
                  <button key={t.id} type="button" aria-pressed={t.id === topicId}
                    onClick={() => setDraft({ ...draft, topicId: t.id, subtopicId: null })}
                    className={`h-9 rounded-lg px-3 text-[15px] transition ${t.id === topicId ? 'bg-paper text-ink font-medium' : 'bg-ink-3 text-dim hover:text-paper'}`}>
                    {topicName(t)}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" hidden />
          </form>
        )}
      </Modal>
    </CaptureContext.Provider>
  )
}
