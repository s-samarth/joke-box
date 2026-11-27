/**
 * Bridges in the builder (docs/sets.md): grey boxes with white text, after the joke or block they
 * carry out of. One line or several paragraphs, and as many as you need in one spot. A new one
 * opens ready to type; × takes it out.
 */
import { CornerDownRight, X } from 'lucide-react'
import { useState } from 'react'
import type { SetBridge } from '../../api/types'
import { GrowingText } from '../../components/ui/Field'

interface Props {
  bridges: SetBridge[]
  onWrite: (id: string, text: string) => void
  onDrop: (id: string) => void
  /** What it follows, for screen readers: "after Fake joke". */
  after: string
}

export function BridgeEditor({ bridges, onWrite, onDrop, after }: Props) {
  // Only a bridge added since this opened takes the cursor, never saved ones on the way in.
  const [had] = useState(() => new Set(bridges.map((b) => b.id)))
  if (!bridges.length) return null
  return (
    <div className="mt-1.5 space-y-1.5">
      {bridges.map((b, n) => (
        <div key={b.id} className="flex items-start gap-1 rounded-lg bg-bridge py-1 pr-1 pl-2.5 text-white">
          <CornerDownRight size={14} className="mt-2.5 shrink-0 opacity-70" aria-hidden />
          <GrowingText aria-label={`Bridge ${n + 1} ${after}`} maxLength={4000} placeholder="Bridge: what carries you into the next one" value={b.text}
            autoFocus={!had.has(b.id)} className="flex-1 py-1.5 leading-snug text-white! placeholder:text-white/60!"
            onChange={(e) => onWrite(b.id, e.target.value)} />
          <button type="button" onClick={() => onDrop(b.id)} aria-label={`Remove bridge ${n + 1} ${after}`}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-white/75 hover:bg-white/10 hover:text-white pointer-coarse:size-11"><X size={15} /></button>
        </div>
      ))}
    </div>
  )
}

/** Bridges to read (the Bird's eye board): the same grey boxes, smaller, blank ones left out. */
export function BridgeNotes({ bridges, className = '' }: { bridges: SetBridge[]; className?: string }) {
  if (!bridges.length) return null
  return (
    <div className={`space-y-1 ${className}`}>
      {bridges.map((b) => (
        <p key={b.id} className="flex gap-1 rounded-md bg-bridge px-1.5 py-1 text-[11.5px] leading-snug whitespace-pre-line text-white">
          <CornerDownRight size={11} className="mt-0.5 shrink-0 opacity-70" aria-label="Bridge" />{b.text}
        </p>
      ))}
    </div>
  )
}
