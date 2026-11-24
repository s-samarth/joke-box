/**
 * The list's width in a SplitView on a wide screen: measured against the split's own width, so
 * it follows the window, and kept as a share of the spare room (see splitWidth.ts). Each list
 * (jokes, premises, observations) remembers its own.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { DEFAULT_SHARE, listBounds, saveShare, savedShare, widthFor } from './splitWidth'

const rem = () => Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16

export function useSplitWidth(noun: string) {
  const container = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(0)
  const [share, setShare] = useState(() => savedShare(noun))

  useLayoutEffect(() => {
    const el = container.current
    if (!el) return
    const measure = () => setSize(el.clientWidth)
    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    return () => watch.disconnect()
  }, [])

  const bounds = listBounds(size, rem())
  const commit = (next: number) => {
    setShare(next)
    saveShare(noun, next)
  }
  const reset = () => {
    setShare(DEFAULT_SHARE)
    saveShare(noun, null)
  }

  return {
    container,
    /** Unmeasured yet, today's width; after that, the share of the spare room. */
    width: size ? widthFor(share, bounds) : undefined,
    divider: { share, bounds, onChange: setShare, onCommit: commit, onReset: reset },
  }
}
