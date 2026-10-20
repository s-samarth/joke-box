/**
 * App-wide feedback: toasts, "are you sure?" confirmations and "type a name" prompts.
 * Pattern: a React context exposes functions, so any component can call
 * `const { toast, confirm, prompt } = useFeedback()` without managing dialog state itself.
 */
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'
import { FeedbackContext, type ConfirmOptions, type PromptOptions } from './feedbackContext'
import { Input } from './Field'
import { Modal } from './Modal'

type Pending =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void }

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([])
  const [pending, setPending] = useState<Pending | null>(null)
  const [text, setText] = useState('')
  const nextId = useRef(0)

  const toast = useCallback((message: string) => {
    const id = ++nextId.current
    setToasts((all) => [...all, { id, message }])
    setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), 2800)
  }, [])
  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ kind: 'confirm', options, resolve })),
    [],
  )
  const prompt = useCallback((options: PromptOptions) => {
    setText(options.initial ?? '')
    return new Promise<string | null>((resolve) => setPending({ kind: 'prompt', options, resolve }))
  }, [])

  const close = (accepted: boolean) => {
    if (!pending) return
    if (pending.kind === 'confirm') pending.resolve(accepted)
    else pending.resolve(accepted && text.trim() ? text.trim() : null)
    setPending(null)
  }

  const options = pending?.options
  const danger = pending?.kind === 'confirm' && pending.options.danger
  return (
    <FeedbackContext.Provider value={{ toast, confirm, prompt }}>
      {children}
      <Modal
        open={pending !== null}
        onOpenChange={(open) => !open && close(false)}
        title={options?.title ?? ''}
        description={pending?.kind === 'confirm' ? pending.options.message : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
            <Button variant={danger ? 'danger' : 'primary'} onClick={() => close(true)}>
              {options?.confirmLabel ?? (pending?.kind === 'prompt' ? 'Save' : 'Confirm')}
            </Button>
          </>
        }
      >
        {pending?.kind === 'prompt' && (
          <form onSubmit={(e) => { e.preventDefault(); close(true) }}>
            <Input autoFocus aria-label={pending.options.label ?? 'Name'} placeholder={pending.options.label}
              value={text} onChange={(e) => setText(e.target.value)} />
          </form>
        )}
      </Modal>
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-full bg-raised px-4 py-2.5 text-sm text-text shadow-pop ring-1 ring-line-strong">
            {t.message}
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  )
}
