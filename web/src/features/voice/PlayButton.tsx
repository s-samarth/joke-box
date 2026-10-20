/** The round play / pause button for a voice note, driven by usePlayer. */
import { LoaderCircle, Pause, Play } from 'lucide-react'
import type { usePlayer } from './usePlayer'

interface Props {
  player: ReturnType<typeof usePlayer>
  /** Busy but not playable yet, e.g. a fresh recording still being stored. */
  waiting?: boolean
}

export function PlayButton({ player, waiting = false }: Props) {
  const busy = waiting || player.state === 'loading'
  return (
    <button type="button" onClick={player.toggle} disabled={waiting} aria-label={player.state === 'playing' ? 'Pause' : 'Play'}
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink-3 text-paper hover:bg-ink-4 disabled:opacity-60">
      {busy ? <LoaderCircle size={18} className="animate-spin" /> : player.state === 'playing' ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
    </button>
  )
}
