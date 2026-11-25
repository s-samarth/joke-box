/**
 * The set's shape: the status track and the checks (checks.ts). Every check is a rule from a
 * Craft note, counted from your own labels, and says where the rule comes from. A check that
 * can't apply yet is greyed out with what it needs, instead of a tick it hasn't earned.
 * The top-up limit is yours to change (it's saved with your label fields).
 */
import type { ReactNode } from 'react'
import type { Beat, SetField, SetFields } from '../../api/types'
import { DurationInput } from '../../components/ui/DurationInput'
import { type Analysis, statusField } from './beats'
import { type Check, type CheckState, setChecks } from './checks'
import { StatusTrack } from './StatusTrack'

const MARK: Record<CheckState, string> = { ok: '✓', warn: '!', later: '', label: '' }
const TAG: Partial<Record<CheckState, string>> = { later: 'Needs more beats', label: 'Needs labels' }

function Box({ state, title, need, children }: { state: CheckState; title: string; need?: string; children: ReactNode }) {
  const off = state === 'later' || state === 'label'
  return (
    <li className={`flex gap-2.5 rounded-lg p-3 text-sm ring-1 ${off ? 'bg-ink-2/40' : 'bg-ink-2'} ${state === 'warn' ? 'ring-amber/40' : 'ring-rule'}`}>
      <span className={`w-3 shrink-0 text-center font-bold ${state === 'warn' ? 'text-amber' : 'text-ok'}`} aria-hidden>{MARK[state]}</span>
      <div className="min-w-0">
        <p className={`font-semibold ${off ? 'text-dim' : 'text-paper'}`}>{title}</p>
        {TAG[state] && <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11.5px] font-semibold text-faint ring-1 ring-rule-strong">{TAG[state]}</span>}
        {need && <p className="mt-0.5 text-dim">{need}</p>}
        <div className={`mt-0.5 ${off ? 'text-faint' : 'text-dim'}`}>{children}</div>
      </div>
    </li>
  )
}

/** Not sure isn't a check: it lists what's left to label, by beat, and which of it holds a check back. */
function Unsure({ analysis: a, fields, waiting }: { analysis: Analysis; fields: SetField[]; waiting: boolean }) {
  const count = a.unsure.reduce((n, u) => n + u.fields.length, 0)
  const holding = !waiting ? [] : fields.filter((f) => f.role && a.unsure.some((u) => u.fields.includes(f.name))).map((f) => f.name)
  return (
    <li className="flex gap-2.5 rounded-lg bg-ink-2 p-3 text-sm ring-1 ring-rule">
      <span className={`w-3 shrink-0 text-center font-bold ${count ? 'text-faint' : 'text-ok'}`} aria-hidden>{count ? '?' : '✓'}</span>
      <div className="min-w-0 text-dim">
        <p className="font-semibold text-paper">{count ? `${count} ${count === 1 ? 'label' : 'labels'} Not sure` : 'Every label set'}</p>
        <p className="mt-0.5">{count ? a.unsure.map((u) => `${u.name}: ${u.fields.length === fields.length ? 'no labels yet' : u.fields.join(', ')}`).join(' · ') : 'Not sure is never guessed in the checks above.'}</p>
        {holding.length > 0 && <p className="mt-0.5 text-faint">{holding.join(' and ')} {holding.length === 1 ? 'holds' : 'hold'} a check back.</p>}
      </div>
    </li>
  )
}

function Limit({ seconds, onChange }: { seconds: number; onChange: (s: number) => void }) {
  return <span className="mx-1 inline-block"><DurationInput small label="Top-up limit" value={seconds} onChange={(s) => { if (s) onChange(s) }} /></span>
}

export function SetChecks({ beats, config, onLimit }: { beats: Beat[]; config: SetFields; onLimit: (s: number) => void }) {
  const { fields, top_up_seconds: limit } = config
  const { analysis: a, checks } = setChecks(beats, config)
  const status = statusField(fields)
  const source: Record<Check['id'], ReactNode> = {
    shift: <>A change in status needs a reason. From “Shift, don't flip”, My status: a flow.</>,
    topup: <>Keep it under<Limit seconds={limit} onChange={onLimit} />(“every 2–4 minutes”, My status: a flow). Neutral doesn't count as a top-up.</>,
    persona: <>All sides show up. From “The persona is the balance”, My persona.</>,
  }
  return (
    <div className="space-y-4">
      {status ? <StatusTrack beats={beats} field={status} fields={fields} analysis={a} limit={limit} /> : <p className="text-sm text-dim">No field is drawn as the status track. Pick one in Fields.</p>}
      <ul className="grid gap-2 md:grid-cols-2">
        {checks.map((c) => <Box key={c.id} state={c.state} title={c.title} need={c.need}>{source[c.id]}</Box>)}
        <Unsure analysis={a} fields={fields} waiting={checks.some((c) => c.state === 'label')} />
      </ul>
    </div>
  )
}
