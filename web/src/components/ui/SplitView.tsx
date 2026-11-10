/**
 * A list with the open item beside it, the way Mail works on an iPad. Jokes, Premises and
 * Observations use it.
 *
 * - Phone and iPad upright: one at a time, the list or the open item (which has its own way back).
 * - iPad landscape and small laptops (1024–1279px): the list fills the screen until you open
 *   something, then narrows to a column beside it.
 * - 1280px and wider: the list stays a column, and with nothing open `aside` fills the space beside it.
 *
 * With an item open, the buttons at its top right read it full width (hiding the list) or close it.
 */
import { Maximize2, Minimize2, X } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { withTransition } from '../../lib/viewTransition'

/** Lists inside a SplitView go two across when they have the screen to themselves. */
export const WIDE_LIST = 'md:grid md:grid-cols-2 md:gap-x-8 xl:block'

const pill = 'inline-flex size-9 items-center justify-center rounded-lg text-dim transition-colors hover:bg-ink-3 hover:text-paper'

interface Props {
  list: ReactNode
  /** The open item, or the aside when nothing is open. */
  children: ReactNode
  /** The open item's id; none means the list is all there is. */
  openId?: string
  /** Where closing goes: the list, with its filters. */
  closeTo: string
  /** What the item is called, for the buttons' labels. */
  noun: string
}

export function SplitView({ list, children, openId, closeTo, noun }: Props) {
  const [full, setFull] = useState(false)
  const open = Boolean(openId)
  // The open item's column scrolls on its own (wide screens): a newly opened item starts at its top.
  const pane = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    if (pane.current) pane.current.scrollTop = 0
  }, [openId])
  const listWidth = !open
    ? 'lg:flex-1 xl:w-[26rem] xl:flex-none xl:border-r'
    : full ? 'hidden' : 'hidden lg:flex lg:w-[22rem] lg:shrink-0 lg:border-r xl:w-[26rem]'
  const wideLabel = full ? 'Show the list' : `Read the ${noun} full width`

  return (
    <div className="lg:-mx-10 lg:flex lg:h-[calc(100dvh-env(safe-area-inset-top))]">
      <section className={`min-w-0 lg:flex-col lg:border-rule lg:px-6 ${open ? '' : 'lg:flex'} ${listWidth}`}>{list}</section>
      <section ref={pane} className={`min-w-0 flex-1 lg:overflow-y-auto lg:px-6 xl:px-10 ${open ? '' : 'hidden xl:block'}`}>
        {open && (
          <div className="sticky top-0 z-10 hidden h-0 justify-end lg:flex">
            <div className="mt-2 flex gap-0.5 rounded-xl bg-ink/85 p-0.5 backdrop-blur">
              <button type="button" onClick={() => withTransition(() => setFull(!full))} aria-label={wideLabel} title={wideLabel} className={pill}>
                {full ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
              <Link to={closeTo} viewTransition onClick={() => setFull(false)} aria-label={`Close the ${noun}`} title={`Close the ${noun}`} className={pill}>
                <X size={18} />
              </Link>
            </div>
          </div>
        )}
        <div key={openId} className="motion-safe:animate-[pane-in_200ms_ease-out]">{children}</div>
      </section>
    </div>
  )
}
