/**
 * Pull to refresh: the round arrow that comes down from the top of the screen as you pull (a finger
 * on a phone or iPad, a two-finger swipe on a laptop's trackpad) and spins while the lists reload,
 * as in iOS Mail. It shows only while you pull or it refreshes; there's no button on screen.
 */
import { RefreshCw } from 'lucide-react'
import { useCallback } from 'react'
import { PULL_TRIGGER } from '../lib/pull'
import { usePullToRefresh } from './usePullToRefresh'
import { useWheelPull } from './useWheelPull'
import { useRefresh } from './useRefresh'

export function PullToRefresh() {
  const { source, run } = useRefresh()
  const pull = useCallback(() => void run('pull'), [run])
  const distance = Math.max(usePullToRefresh(pull), useWheelPull(pull))
  const spinning = source === 'pull'
  const shown = spinning ? PULL_TRIGGER : distance
  if (!shown) return null
  const ready = spinning || distance >= PULL_TRIGGER
  return (
    <div role="status" aria-label={spinning ? 'Refreshing' : ready ? 'Let go to refresh' : 'Pull to refresh'}
      className="pointer-events-none fixed top-[env(safe-area-inset-top)] left-1/2 z-40 flex size-10 items-center justify-center rounded-full bg-ink-3 shadow-lift ring-1 ring-rule-strong"
      style={{ transform: `translate(-50%, ${shown - 44}px)`, opacity: Math.min(1, shown / PULL_TRIGGER) }}>
      <RefreshCw size={18} aria-hidden className={`${ready ? 'text-tape' : 'text-dim'} ${spinning ? 'animate-spin' : ''}`}
        style={spinning ? undefined : { transform: `rotate(${(distance / PULL_TRIGGER) * 270}deg)` }} />
    </div>
  )
}
