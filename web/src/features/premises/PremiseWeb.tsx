/**
 * One premise's web, on its own page: the premise in the middle and its jokes around it, drawn by
 * the same layout and canvas as the premise web on Jokes. It opens fitted to the width there is
 * (a phone, or the pane beside the list) until you zoom. Tap a joke to read it in the same panel.
 */
import { useMemo, useRef, useState } from 'react'
import { useTopics } from '../../api/library'
import type { Premise } from '../../api/premises'
import type { Joke } from '../../api/types'
import { PeekOf } from '../jokes/map/MapPeek'
import { useRoom } from '../jokes/map/useRoom'
import { useSelection } from '../jokes/map/useSelection'
import { WebCanvas } from '../jokes/map/WebCanvas'
import { layoutWebs } from '../jokes/map/webLayout'
import { fitZoom } from '../jokes/map/zoom'
import { ZoomControls } from '../jokes/map/ZoomControls'

export function PremiseWeb({ premise, jokes, all }: { premise: Premise; jokes: Joke[]; all: Joke[] }) {
  const { data: topics = [] } = useTopics()
  const scroller = useRef<HTMLDivElement>(null)
  const room = useRoom(scroller)
  const [chosen, setChosen] = useState<number | null>(null)
  const { selected, pick, close } = useSelection()
  const layout = useMemo(() => layoutWebs(jokes, all, [premise], topics.map((t) => t.id), true), [jokes, all, premise, topics])
  // Fitted until you zoom, so it follows the pane as it narrows or widens.
  const zoom = chosen ?? fitZoom(room, layout.width)

  return (
    <div className="mt-3 space-y-3">
      <div className="flex justify-end">
        <ZoomControls zoom={zoom} onZoom={setChosen} width={layout.width} room={() => scroller.current?.clientWidth ?? 0} />
      </div>
      <WebCanvas webs={layout.webs} width={layout.width} height={layout.height} topics={topics} zoom={zoom} selected={selected} onSelect={pick} scroller={scroller} />
      <PeekOf id={selected} all={all} query="" onPick={pick} onClose={close} />
    </div>
  )
}
