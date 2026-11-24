/**
 * The sheet every "pick something you've written" opens: a tab's own filter row on top, a count
 * line, then rows that look like that tab's list. It began as the cluster's Add versions picker
 * and now serves them all (jokes, premises, observations), so finding a thing to link works the
 * same everywhere.
 *
 * Two ways to pick: `many` ticks as many as you like and adds them with the footer's button (a
 * picked row gets the tape edge and a filled tick); without it a tap picks that one and closes.
 * A `blocked` row can't be picked: it's greyed and says why in its own details. Callers render
 * the sheet only while it's open, so every opening starts with fresh filters and nothing ticked.
 */
import { Check } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'

export const linkStyle = '-my-2 px-1 py-2 font-medium text-dim underline-offset-4 hover:text-paper hover:underline'

export interface PickRow {
  id: string
  body: ReactNode
  /** Can't be picked; the body says why. Shown with `blockedIcon` in place of the tick. */
  blocked?: boolean
  blockedIcon?: ReactNode
}

interface Props {
  title: string
  description: string
  onClose: () => void
  /** Pinned above the filters, to compare against (a cluster's lead). */
  pinned?: ReactNode
  filters: ReactNode
  /** The count line under the filters. */
  status: ReactNode
  rows: PickRow[]
  empty: string
  /** Tick many: what the button says, e.g. ['Link', 'observation', 'observations']. */
  many?: [verb: string, one: string, more: string]
  /** One pick: the one picked now, marked Current. */
  current?: string | null
  /** Below the rows (New premise). */
  after?: ReactNode
  onPick: (ids: string[]) => void
}

export function PickSheet({ title, description, onClose, pinned, filters, status, rows, empty, many, current, after, onPick }: Props) {
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const n = ticked.size
  const tap = (id: string) => {
    if (!many) return onPick([id])
    setTicked((t) => {
      const next = new Set(t)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }
  const add = () => {
    onPick(rows.filter((r) => ticked.has(r.id)).map((r) => r.id))
    onClose()
  }
  const footer = many && (
    <div className="flex flex-1 items-center justify-between gap-3">
      <span className="text-sm text-dim">{n ? <>{n} picked · <button type="button" onClick={() => setTicked(new Set())} className={linkStyle}>Clear</button></> : 'None picked yet'}</span>
      <Button variant="tape" disabled={!n} onClick={add}>{n ? `${many[0]} ${n} ${n === 1 ? many[1] : many[2]}` : `${many[0]} ${many[2]}`}</Button>
    </div>
  )

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={title} description={description} wide footer={footer}>
      {pinned}
      {filters}
      <p className="mt-3 text-sm text-faint">{status}</p>
      <ul className="-mx-5 mt-2 border-t border-rule">
        {rows.length === 0 && <li className="px-5 py-6 text-dim">{empty}</li>}
        {rows.map((r) => {
          const on = ticked.has(r.id) || (!many && r.id === current)
          return (
            <li key={r.id} className="border-b border-rule">
              <button type="button" role={many ? 'checkbox' : undefined} aria-checked={many ? on : undefined} aria-current={!many && on ? 'true' : undefined}
                disabled={r.blocked} onClick={() => tap(r.id)}
                className={`flex w-full items-start gap-3 border-l-[3px] py-3.5 pr-5 pl-[17px] text-left transition-colors ${on ? 'border-tape bg-tape/10' : 'border-transparent'} ${r.blocked ? 'cursor-not-allowed' : on ? '' : 'hover:bg-ink-3/60'}`}>
                {r.blocked ? <span className="mt-0.5 shrink-0 text-faint">{r.blockedIcon}</span> : many && (
                  <span className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${on ? 'border-tape bg-tape text-tape-ink' : 'border-faint'}`}>
                    {on && <Check size={13} strokeWidth={3} aria-hidden />}
                  </span>
                )}
                <span className={`block min-w-0 flex-1 ${r.blocked ? 'opacity-55' : ''}`}>{r.body}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {after}
    </Modal>
  )
}
