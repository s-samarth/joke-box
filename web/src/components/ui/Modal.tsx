/**
 * Sheet built on Radix Dialog (Radix handles focus, Escape and screen readers; we style it).
 * A bottom sheet on phones, a centred panel on desktop.
 */
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function Modal({ open, onOpenChange, title, description, children, footer, wide }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#0b0d13]/75" />
        <Dialog.Content
          className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl bg-ink-2 shadow-lift ring-1 ring-rule-strong outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[86dvh] sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-ink-4 sm:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
            <div>
              <Dialog.Title className="headline text-[28px]">{title}</Dialog.Title>
              <Dialog.Description className={description ? 'mt-1.5 text-sm text-dim' : 'sr-only'}>
                {description ?? title}
              </Dialog.Description>
            </div>
            <Dialog.Close className="-mr-2 inline-flex size-10 items-center justify-center rounded-lg text-dim hover:bg-ink-3 hover:text-paper" aria-label="Close">
              <X size={20} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {footer && <div className="pb-safe flex justify-end gap-2 border-t border-rule px-5 py-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
