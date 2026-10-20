/**
 * App-wide feedback: toasts (optionally with an action), confirmations and name prompts.
 * A React context exposes functions, so any component can call `useFeedback().toast(...)`.
 */
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'
import { FeedbackContext, type ConfirmOptions, type PromptOptions, type ToastAction } from './feedbackContext'
import { Input } from './Field'
import { Modal } from './Modal'

type Pending =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void }

interface Toast {
  id: number
  message: string
  action?: ToastAction
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [pending, setPending] = useState<Pending | null>(null)
  const [text, setText] = useState('')
  const nextId = useRef(0)

  const dismiss = (id: number) => setToasts((all) => all.filter((t) => t.id !== id))
  const toast = useCallback((message: string, action?: ToastAction) => {
    const id = ++nextId.current
    setToasts((all) => [...all.slice(-2), { id, message, action }])
    setTimeout(() => dismiss(id), action ? 5000 : 2600)
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

  const danger = pending?.kind === 'confirm' && pending.options.danger
  return (
    <FeedbackContext.Provider value={{ toast, confirm, prompt }}>
      {children}
      <Modal
        open={pending !== null}
        onOpenChange={(open) => !open && close(false)}
        title={pending?.options.title ?? ''}
        description={pending?.kind === 'confirm' ? pending.options.message : undefined}
        footer={
          <>
            <Button variant="quiet" onClick={() => close(false)}>Cancel</Button>
            <Button variant={danger ? 'danger' : 'tape'} onClick={() => close(true)}>
              {pending?.options.confirmLabel ?? (pending?.kind === 'prompt' ? 'Save' : 'Confirm')}
            </Button>
          </>
        }
      >
        {pending?.kind === 'prompt' && (
          <form onSubmit={(e) => { e.preventDefault(); close(true) }}>
            <Input autoFocus aria-label={pending.options.label ?? 'Name'} placeholder={pending.options.label} value={text} onChange={(e) => setText(e.target.value)} />
          </form>
        )}
      </Modal>
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-8" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-3 rounded-xl bg-paper py-2.5 pr-2 pl-4 text-[15px] text-ink shadow-lift">
            <span>{t.message}</span>
            {t.action && (
              <button type="button" className="rounded-lg px-2.5 py-1 font-semibold underline-offset-2 hover:underline" onClick={() => { t.action?.onClick(); dismiss(t.id) }}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  )
}
