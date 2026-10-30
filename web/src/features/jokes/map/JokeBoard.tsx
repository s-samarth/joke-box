/**
 * The joke board: the jokes the list is showing, scattered over topic islands like cards on a
 * corkboard, with chains kept together and joined by arrows (boardLayout). Drag a joke to move it
 * and it stays there (a queued save, so it works offline); Tidy up puts the moved ones back.
 * Tap a joke to read it in the same panel as the map.
 */
import { LayoutGrid } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useBoardSpots, usePlaceJoke, useTidyBoard } from '../../../api/board'
import { useTopics } from '../../../api/library'
import type { Joke } from '../../../api/types'
import { Button } from '../../../components/ui/Button'
import { useFeedback } from '../../../components/ui/feedbackContext'
import { BoardCanvas } from './BoardCanvas'
import { CELL, layoutBoard, spotIn } from './boardLayout'
import { PeekOf } from './MapPeek'
import { useRoom } from './useRoom'
import { useSelection } from './useSelection'
import { ZoomControls } from './ZoomControls'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function JokeBoard({ shown, all, query }: { shown: Joke[]; all: Joke[]; query: string }) {
  const { data: topics = [] } = useTopics()
  const { data: spots = [] } = useBoardSpots()
  const place = usePlaceJoke()
  const tidy = useTidyBoard()
  const { confirm } = useFeedback()
  const scroller = useRef<HTMLDivElement>(null)
  const room = useRoom(scroller)
  const [zoom, setZoom] = useState(() => (window.innerWidth < 640 ? 0.55 : 0.85))
  const spotMap = useMemo(() => new Map(spots.map((s) => [s.joke_id, s])), [spots])
  // Islands wrap to the width on screen at this zoom, so zooming out fits more side by side, and
  // an island is always at least two cards wide, so a phone still gets a board, not a list.
  const rowWidth = Math.max(room / zoom, 2 * CELL.w + 48)
  const board = useMemo(() => layoutBoard(shown, all, topics.map((t) => t.id), spotMap, rowWidth), [shown, all, topics, spotMap, rowWidth])
  const [hovered, setHovered] = useState<number | null>(null)
  const { selected, pick, close } = useSelection()
  const chainOf = useMemo(() => new Map(board.boxes.map((b) => [b.joke.id, b.chain])), [board])
  const lit = hovered ?? (selected ? chainOf.get(selected) ?? null : null)
  const moved = board.boxes.filter((b) => b.pinned).map((b) => b.joke.id)

  const move = (id: string, dx: number, dy: number) => {
    const box = board.boxes.find((b) => b.joke.id === id)
    const island = board.islands.find((i) => i.topicId === box?.island)
    if (box && island) place.mutate({ jokeId: id, input: spotIn(island, box.x + dx, box.y + dy) })
  }
  const tidyUp = async () => {
    const ok = await confirm({ title: 'Tidy up the board?', message: `${plural(moved.length, 'joke you moved goes', 'jokes you moved go')} back into the grid.`, confirmLabel: 'Tidy up' })
    if (ok) tidy.mutate(moved)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-sm text-dim">
          {plural(board.islands.length, 'topic', 'topics')}, {plural(board.boxes.length, 'joke', 'jokes')}
          {board.chains > 0 && `, ${plural(board.chains, 'chain', 'chains')}`}. Drag a joke to move it (on a phone, hold it first); tap it to read it.
        </p>
        <div className="flex items-center gap-2">
          <Button small variant="quiet" icon={<LayoutGrid size={15} />} disabled={!moved.length} onClick={() => void tidyUp()}>Tidy up</Button>
          <ZoomControls zoom={zoom} onZoom={setZoom} width={board.width} room={() => scroller.current?.clientWidth ?? 0} />
        </div>
      </div>
      <BoardCanvas board={board} topics={topics} zoom={zoom} lit={lit} selected={selected} scroller={scroller}
        onSelect={pick} onLight={setHovered} onMove={move} />
      <PeekOf id={selected} all={all} query={query} onPick={pick} onClose={close} />
    </div>
  )
}
