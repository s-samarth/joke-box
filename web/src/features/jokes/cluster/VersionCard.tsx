/**
 * One version in a cluster, as a box beside the others: the setup and punchline edited in place
 * (saved like the joke page), its status, strength, runtime and how it went at shows. The lead
 * wears a tape-yellow outline; every other active version has its own Make lead button, so
 * picking the lead takes one tap from the comparison. Everything else is in the ⋯ menu, and Open
 * goes to the full joke.
 */
import { ArrowRight, Copy, Crown, MoreHorizontal, RotateCcw, Trash2, Unlink, CircleX } from 'lucide-react'
import { Link } from 'react-router'
import { useLogs } from '../../../api/shows'
import type { Joke } from '../../../api/types'
import { IconButton } from '../../../components/ui/Button'
import { GrowingText } from '../../../components/ui/Field'
import { Dropdown, type MenuItem } from '../../../components/ui/Menu'
import { StrengthTicks } from '../../../components/ui/pieces'
import { clock } from '../../../lib/duration'
import { statusOf } from '../../../lib/jokeMeta'
import { recordLine, showRecord } from '../../shows/showJokes'
import { isDiscarded } from '../discarded'
import { useAutosaveJoke } from '../useAutosaveJoke'
import type { useClusterActions } from './useClusterActions'

interface Props {
  joke: Joke
  isLead: boolean
  actions: ReturnType<typeof useClusterActions>
  /** Where Open goes, with the list's filters. */
  openTo: string
}

export function VersionCard({ joke, isLead, actions, openTo }: Props) {
  const { draft, update } = useAutosaveJoke(joke)
  const { data: logs = [] } = useLogs()
  const record = showRecord(logs, joke.id)
  const discarded = isDiscarded(joke)
  const menu: MenuItem[] = [
    ...(!isLead && !discarded ? [{ label: 'Make lead', icon: <Crown size={16} />, onSelect: () => actions.makeLead(joke) }] : []),
    { label: 'Duplicate as a new version', icon: <Copy size={16} />, onSelect: () => actions.duplicate(joke) },
    discarded
      ? { label: 'Bring back', icon: <RotateCcw size={16} />, onSelect: () => actions.bringBack(joke) }
      : { label: 'Discard', icon: <CircleX size={16} />, onSelect: () => actions.discard(joke) },
    { label: 'Take out of cluster', icon: <Unlink size={16} />, onSelect: () => actions.takeOut(joke) },
    { label: 'Delete joke', icon: <Trash2 size={16} />, onSelect: () => void actions.deleteJoke(joke), danger: true },
  ]

  return (
    <li className={`flex flex-col gap-2 rounded-xl border p-3.5 ${isLead ? 'border-2 border-tape bg-ink-2' : 'border-rule-strong bg-ink-2/60'} ${discarded ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        {isLead ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-tape px-2 py-0.5 text-[13px] font-medium text-tape-ink"><Crown size={13} aria-hidden />Lead</span>
        ) : discarded ? (
          <span className="text-[13px] text-faint">Discarded</span>
        ) : (
          <button type="button" onClick={() => actions.makeLead(joke)}
            className="inline-flex items-center gap-1.5 rounded-md border border-rule-strong px-2 py-0.5 text-[13px] text-dim hover:border-tape hover:text-tape">
            <Crown size={13} aria-hidden />Make lead
          </button>
        )}
        <Dropdown items={menu} trigger={<IconButton label="Version actions" className="-my-1 -mr-1.5"><MoreHorizontal size={18} /></IconButton>} />
      </div>
      <GrowingText aria-label="Setup" placeholder="The setup" className="leading-snug" value={draft.setup} onChange={(e) => update({ setup: e.target.value })} />
      <GrowingText aria-label="Punchline" placeholder="The punchline" className="leading-snug text-tape" value={draft.punchline} onChange={(e) => update({ punchline: e.target.value })} />
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[13px] text-faint">
        <span>{statusOf(joke.status)}</span>
        <StrengthTicks strength={joke.strength} />
        {joke.duration_seconds > 0 && <span className="tabular">{clock(joke.duration_seconds)}</span>}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-rule pt-2 text-[13px] text-dim">
        <span>{record.shows ? recordLine(record) : 'Not done at a show yet'}</span>
        <Link to={openTo} className="inline-flex shrink-0 items-center gap-1 text-dim hover:text-tape">Open<ArrowRight size={14} aria-hidden /></Link>
      </div>
    </li>
  )
}
