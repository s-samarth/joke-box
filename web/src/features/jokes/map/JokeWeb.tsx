/**
 * The premise web: each premise with the jokes resting on it around it, whatever topic they're
 * from. Jokes on no premise aren't drawn; a link lists them so you can sort them in.
 */
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useTopics } from '../../../api/library'
import { usePremises } from '../../../api/premises'
import type { Joke } from '../../../api/types'
import { NO_PREMISE } from '../../../lib/premises'
import { PeekOf } from './MapPeek'
import { useRoom } from './useRoom'
import { useSelection } from './useSelection'
import { WebCanvas } from './WebCanvas'
import { layoutWebs } from './webLayout'
import { ZoomControls } from './ZoomControls'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

interface Props {
  shown: Joke[]
  all: Joke[]
  query: string
  /** No filters on: draw every premise, empty ones too. */
  everything: boolean
}

export function JokeWeb({ shown, all, query, everything }: Props) {
  const { data: topics = [] } = useTopics()
  const { data: premises = [] } = usePremises()
  const scroller = useRef<HTMLDivElement>(null)
  const room = useRoom(scroller)
  const [zoom, setZoom] = useState(() => (window.innerWidth < 640 ? 0.4 : 0.7))
  const { selected, pick, close } = useSelection()
  const rowWidth = Math.max(room / zoom, 1200)
  const layout = useMemo(() => layoutWebs(shown, all, premises, topics.map((t) => t.id), everything, rowWidth), [shown, all, premises, topics, everything, rowWidth])
  const loose = shown.filter((j) => !j.premise_id).length
  const on = layout.webs.reduce((s, w) => s + w.nodes.length, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-sm text-dim">
          {layout.webs.length ? `${plural(layout.webs.length, 'premise', 'premises')}, ${plural(on, 'joke', 'jokes')} on them. Tap a premise to open it, a joke to read it.` : 'No premises here yet.'}
          {loose > 0 && <> <Link to={`/jokes?premise=${NO_PREMISE}`} className="text-tape hover:underline">{plural(loose, 'joke isn’t', 'jokes aren’t')} on a premise.</Link></>}
        </p>
        {layout.webs.length > 0 && <ZoomControls zoom={zoom} onZoom={setZoom} width={layout.width} room={() => scroller.current?.clientWidth ?? 0} />}
      </div>
      {layout.webs.length > 0 ? (
        <WebCanvas webs={layout.webs} width={layout.width} height={layout.height} topics={topics} zoom={zoom} selected={selected} onSelect={pick} scroller={scroller} />
      ) : (
        <p className="max-w-md text-[15px] leading-relaxed text-dim">
          Open <Link to="/premises" className="text-tape hover:underline">Premises</Link> to write one, or pick a premise on any joke under <span className="text-paper">Premise</span>.
        </p>
      )}
      <PeekOf id={selected} all={all} query={query} onPick={pick} onClose={close} />
    </div>
  )
}
