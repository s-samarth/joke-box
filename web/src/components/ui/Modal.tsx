/**
 * Modal built on Radix Dialog ("headless": Radix handles focus, Escape and screen readers;
 * we only style it). On phones it slides up as a bottom sheet, on desktop it's centred.
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Content
          className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-panel ring-1 ring-line-strong shadow-pop outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[86dvh] sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
          aria-describedby={description ? undefined : undefined}
        >
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
            <div>
              <Dialog.Title className="font-display text-xl font-semibold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="-mt-1 -mr-2 inline-flex size-10 items-center justify-center rounded-xl text-muted hover:bg-white/5 hover:text-text"
              aria-label="Close"
            >
              <X size={20} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {footer && (
            <div className="pb-safe flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
