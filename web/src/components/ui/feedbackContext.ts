import { createContext, useContext } from 'react'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
}

export interface PromptOptions {
  title: string
  label?: string
  initial?: string
  confirmLabel?: string
}

export interface Feedback {
  toast: (message: string) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
  prompt: (options: PromptOptions) => Promise<string | null>
}

export const FeedbackContext = createContext<Feedback | null>(null)

/** Toasts, confirmations and prompts from anywhere: `const { toast } = useFeedback()`. */
export function useFeedback(): Feedback {
  const value = useContext(FeedbackContext)
  if (!value) throw new Error('useFeedback must be used inside FeedbackProvider')
  return value
}
