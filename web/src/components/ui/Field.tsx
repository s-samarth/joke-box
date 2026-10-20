import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const control =
  'w-full rounded-xl bg-panel px-3 text-[16px] sm:text-sm text-text placeholder:text-faint ring-1 ring-line-strong outline-none transition focus:ring-2 focus:ring-accent'

/** A labelled form row. 16px text on phones stops iOS from zooming into inputs. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="block text-xs text-faint">{hint}</span>}
    </label>
  )
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${control} h-11 sm:h-10 ${className}`} {...rest} />
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${control} min-h-24 py-2.5 leading-relaxed ${className}`} {...rest} />
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${control} h-11 appearance-none pr-8 sm:h-10 ${className}`} {...rest}>
      {children}
    </select>
  )
}
