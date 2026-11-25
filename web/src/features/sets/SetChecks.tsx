/**
 * The set's shape: the status track and four checks. Every check is a rule from a Craft note,
 * counted from your own labels, and says where the rule comes from. Nothing here judges a joke.
 * The top-up limit is yours to change (it's saved with your label fields).
 */
import { useState, type ReactNode } from 'react'
import type { Beat, SetField, SetFields } from '../../api/types'
import { clock, parse } from '../../lib/duration'
import { analyse, personaField, statusField } from './beats'
import { StatusTrack } from './StatusTrack'

type Kind = 'ok' | 'warn' | 'info'
const MARK: Record<Kind, string> = { ok: '✓', warn: '!', info: '·' }
const TONE: Record<Kind, string> = { ok: 'text-ok', warn: 'text-amber', info: 'text-faint' }

function Check({ kind, title, children }: { kind: Kind; title: string; children: ReactNode }) {
  return (
    <li className={`flex gap-2.5 rounded-lg bg-ink-2 p-3 text-sm ring-1 ${kind === 'warn' ? 'ring-amber/40' : 'ring-rule'}`}>
      <span className={`w-3 shrink-0 text-center font-bold ${TONE[kind]}`} aria-hidden>{MARK[kind]}</span>
      <div className="min-w-0"><p className="font-semibold text-paper">{title}</p><div className="mt-0.5 text-dim">{children}</div></div>
    </li>
  )
}

function Limit({ seconds, onChange }: { seconds: number; onChange: (s: number) => void }) {
  const [text, setText] = useState(clock(seconds))
  return (
    <input aria-label="Top-up limit" inputMode="numeric" value={text} onChange={(e) => setText(e.target.value)}
      onBlur={() => { const s = parse(text); if (s && s !== seconds) onChange(s); setText(clock(s || seconds)) }}
      className="mx-1 inline-block h-7 w-14 rounded-md bg-ink-3 text-center text-paper tabular ring-1 ring-rule-strong outline-none focus:ring-2 focus:ring-tape" />
  )
}

export function SetChecks({ beats, config, onLimit }: { beats: Beat[]; config: SetFields; onLimit: (s: number) => void }) {
  const fields: SetField[] = config.fields
  const a = analyse(beats, fields)
  const status = statusField(fields)
  const persona = personaField(fields)
  const limit = config.top_up_seconds
  return (
    <div className="space-y-4">
      {status ? <StatusTrack beats={beats} field={status} fields={fields} analysis={a} limit={limit} /> : <p className="text-sm text-dim">No field is drawn as the status track. Pick one in Fields.</p>}
      <ul className="grid gap-2 md:grid-cols-2">
        {status && (
          <Check kind={a.flips.length ? 'warn' : 'ok'} title={a.flips.length ? `Shift with no reason: ${a.flips.map((b) => b.cue || 'a beat').join(', ')}` : 'Every status shift has a reason'}>
            A change in status needs a reason. From “Shift, don't flip”, My status: a flow.
          </Check>
        )}
        {status && (
          <Check kind={a.longest > limit ? 'warn' : 'ok'} title={`Longest stretch with no humility top-up: ${clock(a.longest)}`}>
            Keep it under<Limit key={limit} seconds={limit} onChange={onLimit} />(“every 2–4 minutes”, My status: a flow). Neutral doesn't count as a top-up.
          </Check>
        )}
        {persona && (
          <Check kind={a.missing.length ? 'warn' : 'ok'} title={a.missing.length ? `${a.missing.join(', ')} never drives a beat` : `Every ${persona.name.toLowerCase()} drives at least one beat`}>
            All sides show up. From “The persona is the balance”, My persona.
          </Check>
        )}
        <Check kind="info" title={a.unsure.length ? `${a.unsure.length} ${a.unsure.length === 1 ? 'label' : 'labels'} Not sure` : 'Every label set'}>
          {a.unsure.length ? a.unsure.join(' · ') : 'Not sure is left out of the checks above.'}
        </Check>
      </ul>
    </div>
  )
}
