/** Zoom out, zoom in and fit to width, shared by the joke map and the joke board. */
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import { IconButton } from '../../../components/ui/Button'

const ZOOMS = [0.3, 0.4, 0.55, 0.7, 0.85, 1, 1.2]

interface Props {
  zoom: number
  onZoom: (zoom: number) => void
  /** The width the drawing takes at 100%, to fit it to the space there is. */
  width: number
  room: () => number
}

export function ZoomControls({ zoom, onZoom, width, room }: Props) {
  const step = (dir: 1 | -1) => onZoom(ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, ZOOMS.findIndex((x) => x >= zoom - 0.001) + dir))])
  return (
    <div className="flex items-center gap-1 rounded-lg bg-ink-2 p-1 ring-1 ring-rule">
      <IconButton label="Zoom out" disabled={zoom <= ZOOMS[0]} onClick={() => step(-1)}><ZoomOut size={17} /></IconButton>
      <span className="w-12 text-center text-sm tabular text-dim">{Math.round(zoom * 100)}%</span>
      <IconButton label="Zoom in" disabled={zoom >= ZOOMS[ZOOMS.length - 1]} onClick={() => step(1)}><ZoomIn size={17} /></IconButton>
      <IconButton label="Fit to width" onClick={() => onZoom(Math.max(ZOOMS[0], Math.min(1, (room() - 32) / width)))}><Maximize2 size={16} /></IconButton>
    </div>
  )
}
