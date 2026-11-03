/** iOS often sends only `visibilitychange` when you switch apps: editors must save on it. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushAll, onHide, writeWhenHidden } from './saveOnHide'

function page() {
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  const win = new EventTarget()
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', win)
  const hide = () => { doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange')) }
  return { doc, win, hide }
}

afterEach(() => vi.unstubAllGlobals())

describe('saving as the app is put away', () => {
  it('saves when the page is hidden, or closed', () => {
    const { win, hide } = page()
    const flush = vi.fn()
    const stop = onHide(flush)
    hide()
    win.dispatchEvent(new Event('pagehide'))
    expect(flush).toHaveBeenCalledTimes(2)
    stop()
    hide()
    expect(flush).toHaveBeenCalledTimes(2)
  })

  it('a tab handing over sends every editor\'s waiting change', () => {
    page()
    const a = vi.fn()
    const b = vi.fn()
    const stops = [onHide(a), onHide(b)]
    flushAll()
    expect([a.mock.calls.length, b.mock.calls.length]).toEqual([1, 1])
    stops.forEach((stop) => stop())
  })

  it('writes the saved copy after the editors have saved into it', () => {
    const { hide } = page()
    const order: string[] = []
    // As in the app: registered at launch, before any editor opens, so its listener runs first.
    writeWhenHidden(async () => { order.push('write') })
    const stop = onHide(() => order.push('editor'))
    hide()
    expect(order.slice(0, 2)).toEqual(['editor', 'write'])
    stop()
  })
})
