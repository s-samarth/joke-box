/** Set name, show date, venue and target, plus the total-vs-target bar. */
import { useState } from 'react'
import { useVenues } from '../../api/shows'
import { Field, Input } from '../../components/ui/Field'
import { clock, parse } from '../../lib/duration'
import { progress } from './setlistMath'

export interface SetMeta {
  name: string
  showDate: string
  venueName: string
  targetSeconds: number
}

interface Props {
  meta: SetMeta
  onChange: (meta: SetMeta) => void
  total: number
}

export function SetHeader({ meta, onChange, total }: Props) {
  const { data: venues = [] } = useVenues()
  const [target, setTarget] = useState(clock(meta.targetSeconds))
  const p = progress(total, meta.targetSeconds)
  const set = (changes: Partial<SetMeta>) => onChange({ ...meta, ...changes })

  return (
    <div className="space-y-4">
      <input
        aria-label="Setlist name"
        value={meta.name}
        onChange={(e) => set({ name: e.target.value })}
        className="w-full bg-transparent font-display text-2xl font-bold tracking-tight outline-none placeholder:text-faint sm:text-3xl"
        placeholder="Untitled Setlist"
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Show date">
          <Input type="date" value={meta.showDate} onChange={(e) => set({ showDate: e.target.value })} />
        </Field>
        <Field label="Target (mm:ss)">
          <Input
            inputMode="numeric"
            className="tabular"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onBlur={() => {
              const seconds = parse(target)
              if (seconds !== null) set({ targetSeconds: seconds })
              setTarget(clock(seconds ?? meta.targetSeconds))
            }}
          />
        </Field>
        <div className="col-span-2 sm:col-span-1">
          <Field label="Venue">
            <Input list="jokebox-venues" placeholder="Optional" value={meta.venueName} onChange={(e) => set({ venueName: e.target.value })} />
            <datalist id="jokebox-venues">{venues.map((v) => <option key={v.id} value={v.name} />)}</datalist>
          </Field>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between text-sm">
          <span className={`font-display text-xl tabular ${p.over ? 'text-warn' : ''}`}>
            {clock(total)} <span className="text-sm text-faint">of {clock(meta.targetSeconds)}</span>
          </span>
          <span className={p.over ? 'text-warn' : 'text-faint'}>
            {p.over ? `${clock(total - meta.targetSeconds)} over` : `${p.percent}%`}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={p.percent} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full transition-all ${p.over ? 'bg-warn' : 'bg-accent'}`} style={{ width: `${p.bar}%` }} />
        </div>
      </div>
    </div>
  )
}
