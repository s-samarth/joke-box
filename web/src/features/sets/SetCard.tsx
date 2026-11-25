/**
 * One set on Sets (docs/screens-perform.md): its point, its spine as cue strips sized by beat
 * time and edged with the status colour, its checks in a word each, and its length against the
 * slot. A set from before beats says so and offers to split it. The card opens the builder.
 */
import { MoreHorizontal, Play, ScrollText, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import type { SetFields, Setlist } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { Stars } from '../../components/ui/pieces'
import { Dropdown } from '../../components/ui/Menu'
import { clock } from '../../lib/duration'
import { beatTotal, beatsOf, groupOf, statusField } from './beats'
import { cardChecks, madeBeforeBeats, showDay, statusOf } from './setCard'
import { lightState } from './setlistMath'

const EDGE = { win: 'border-ok', neutral: 'border-sky', loss: 'border-amber' }
/** The set's status in the card's corner: Draft white, Work in Progress yellow, Stage Ready green, Discarded red. */
const STATUS = { Draft: 'bg-paper text-ink', 'Work in Progress': 'bg-tape text-tape-ink', 'Stage Ready': 'bg-ok text-ink', Discarded: 'bg-light text-paper' }
const PILL = { ok: 'bg-ok/15 text-ok', warn: 'bg-amber/15 text-amber', info: 'bg-ink-3 text-dim' }

interface Props { set: Setlist; config: SetFields; tagName: Map<string, string>; onDelete: (s: Setlist) => void }

export function SetCard({ set: s, config, tagName, onDelete }: Props) {
  const navigate = useNavigate()
  const beats = beatsOf(s)
  const older = madeBeforeBeats(s, beats)
  const total = beatTotal(beats)
  const left = s.target_seconds - total
  const light = lightState(total, s.target_seconds)
  const status = statusField(config.fields)
  const checks = older ? [] : cardChecks(beats, config)
  const open = `/sets/${s.id}`
  const status_ = statusOf(s)
  const meta = [s.show_date && showDay(s.show_date), s.venue_name, `${clock(s.target_seconds)} slot`].filter(Boolean).join(' · ')
  const tags = (s.tag_ids ?? []).map((id) => tagName.get(id)).filter((n): n is string => Boolean(n))

  return (
    <article className="flex min-w-0 flex-col gap-3.5 rounded-2xl bg-ink-2 p-4 ring-1 ring-rule sm:p-5">
      <div className="flex items-start gap-2">
        <Link to={open} className="min-w-0 flex-1">
          <h2 className="headline truncate text-[28px] sm:text-[32px]">{s.name}</h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[13.5px] text-dim">{meta}{s.rating && <Stars rating={s.rating} size={13} />}</p>
        </Link>
        <span className={`inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[13px] font-semibold whitespace-nowrap ${STATUS[status_]}`}>{status_}</span>
        <Dropdown items={[
          ...(s.items.length > 0 ? [{ label: 'Stage view', icon: <Play size={16} />, onSelect: () => navigate(`${open}/stage`) }] : []),
          { label: 'Cue card', icon: <ScrollText size={16} />, onSelect: () => navigate(`${open}/print`) },
          { label: 'Delete set', icon: <Trash2 size={16} />, danger: true, onSelect: () => onDelete(s) },
        ]} trigger={<IconButton label="More"><MoreHorizontal size={18} /></IconButton>} />
      </div>

      {s.point ? (
        <p className="text-[15px] leading-snug italic">“{s.point}”</p>
      ) : !older && (
        <Link to={open} className="border-b border-dashed border-rule-strong pb-1.5 text-[15px] text-dim hover:text-paper">+ Write your point: what should the room think by the end?</Link>
      )}

      {older ? (
        <div className="space-y-2.5">
          <p className="rounded-md bg-ink-4 px-2.5 py-2 text-sm"><b>Set</b> · {s.items.length} {s.items.length === 1 ? 'joke' : 'jokes'} in one list <span className="tabular text-dim">· {clock(total)}</span></p>
          <p className="text-sm leading-snug text-dim">Made before beats, so everything sits in one beat. Open it and split it into beats with a cue word each.</p>
          <Link to={open} className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold ring-1 ring-rule-strong hover:bg-ink-3">Split into beats</Link>
        </div>
      ) : beats.length ? (
        <ol className="flex flex-wrap gap-1.5" aria-label="Spine">
          {beats.map((b, i) => {
            const g = status ? groupOf(b, config.fields) : null
            return (
              <li key={b.id} style={{ flexGrow: Math.max(b.seconds, 30) }} className={`flex min-w-[4.75rem] basis-[4.75rem] flex-col gap-0.5 rounded-md border-b-4 bg-tape px-2.5 pt-1.5 pb-1 text-tape-ink ${g ? EDGE[g] : 'border-ink-4'}`}>
                <b className="truncate text-[13px] sm:text-sm" title={b.cue}>{b.cue || `Beat ${i + 1}`}</b>
                <span className="tabular text-[11.5px] opacity-75">{clock(b.seconds)}</span>
              </li>
            )
          })}
          {left > 0 && (
            <li style={{ flexGrow: left }} className="flex min-w-[4.75rem] basis-[4.75rem] flex-col justify-center rounded-md px-2.5 text-[12px] text-dim ring-1 ring-rule-strong ring-inset">
              <span className="tabular">{clock(left)} to plan</span>
            </li>
          )}
        </ol>
      ) : (
        <Link to={open} className="rounded-md px-3 py-2.5 text-sm text-dim ring-1 ring-rule-strong ring-inset hover:text-paper">No beats yet. + Add the first one</Link>
      )}

      {checks.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Checks">
          {checks.map((c) => <li key={c.text} className={`rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${PILL[c.kind]}`}>{c.kind === 'ok' && '✓ '}{c.text}</li>)}
        </ul>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-rule pt-3">
        <span className="tabular text-[15px]">
          <b className={light === 'over' ? 'text-light' : light === 'light' ? 'text-amber' : ''}>{clock(total)}</b>
          <span className="text-dim"> of {clock(s.target_seconds)}</span>
        </span>
        <span className="text-[13.5px] text-dim">· {beats.length} {beats.length === 1 ? 'beat' : 'beats'} · {s.items.length} {s.items.length === 1 ? 'joke' : 'jokes'}</span>
        {tags.length > 0 && <span className="ml-auto flex flex-wrap items-center gap-1.5">
          {tags.map((t) => <span key={t} className="rounded-full bg-ink-3 px-2 py-0.5 text-[12.5px] text-dim">{t}</span>)}
        </span>}
      </div>
    </article>
  )
}
