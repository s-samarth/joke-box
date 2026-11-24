/** A card in the writing pulse: a quiet title over its content. */
import type { ReactNode } from 'react'

export function PulseCard({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-xl border border-rule bg-ink-2 p-4 ${className}`}>
      <h3 className="mb-3 text-sm text-dim">{title}</h3>
      {children}
    </section>
  )
}
