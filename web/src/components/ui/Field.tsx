import { useImperativeHandle, useLayoutEffect, useRef, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const box =
  'w-full rounded-lg bg-ink-2 px-3 text-[16px] text-paper placeholder:text-faint ring-1 ring-rule-strong outline-none transition focus:ring-2 focus:ring-tape sm:text-[15px]'

/** A labelled row. Inputs use 16px text on phones so iOS doesn't zoom in. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-dim">{label}</span>
      {children}
      {hint && <span className="block text-xs text-faint">{hint}</span>}
    </label>
  )
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${box} h-11 sm:h-10 ${className}`} {...rest} />
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${box} h-11 appearance-none pr-8 sm:h-10 ${className}`} {...rest}>
      {children}
    </select>
  )
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${box} min-h-24 py-2.5 leading-relaxed ${className}`} {...rest} />
}

/**
 * A textarea with no box that grows with its text: used for editing a joke in place,
 * so the page reads like the joke itself rather than a form.
 */
export function GrowingText({ className = '', value, ref: outer, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string; ref?: Ref<HTMLTextAreaElement> }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  // The box needs its own ref to measure itself; a caller's ref gets the same element.
  useImperativeHandle(outer, () => ref.current!, [])
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      className={`block w-full resize-none overflow-hidden bg-transparent text-paper placeholder:text-faint outline-none focus:outline-none ${className}`}
      {...rest}
    />
  )
}
