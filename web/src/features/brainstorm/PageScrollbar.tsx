/**
 * A thin bar under a handwriting page showing which part of its width is on screen, since the
 * page is wider than the screen and pans sideways (with a finger, or a trackpad swipe).
 */
export function PageScrollbar({ shown, total, at }: { shown: number; total: number; at: number }) {
  if (!total || shown >= total) return null
  return (
    <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-ink-3" aria-hidden>
      <div className="h-1 rounded-full bg-dim" style={{ width: `${(shown / total) * 100}%`, marginLeft: `${(at / total) * 100}%` }} />
    </div>
  )
}
