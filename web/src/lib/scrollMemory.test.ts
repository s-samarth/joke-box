import { describe, expect, it } from 'vitest'
import { newMemory, remember, scrollAfter, type Place } from './scrollMemory'

const at = (key: string, pathname: string, search = ''): Place => ({ key, pathname, search })

describe('scroll between screens', () => {
  const list = at('k1', '/jokes', '?topic=t1')
  const joke = at('k2', '/jokes/j1', '?topic=t1')

  it('opens a new screen at its top, however far down the list was', () => {
    const memory = newMemory()
    remember(memory, list, 1500)
    expect(scrollAfter('PUSH', list, joke, memory)).toBe(0)
  })

  it("returns to where the list was left from the joke's own way back", () => {
    const memory = newMemory()
    remember(memory, list, 1500)
    remember(memory, joke, 0)
    expect(scrollAfter('PUSH', joke, at('k3', '/jokes', '?topic=t1'), memory)).toBe(1500)
  })

  it('starts a differently filtered list at the top', () => {
    const memory = newMemory()
    remember(memory, list, 1500)
    expect(scrollAfter('PUSH', joke, at('k3', '/jokes'), memory)).toBe(0)
  })

  it('returns to where a screen was left on Back', () => {
    const memory = newMemory()
    remember(memory, list, 1500)
    remember(memory, joke, 300)
    expect(scrollAfter('POP', joke, list, memory)).toBe(1500)
    expect(scrollAfter('POP', list, at('unseen', '/sets'), memory)).toBe(0)
  })

  it('leaves the scroll alone when only a filter or a sheet changes, and when the app opens', () => {
    const memory = newMemory()
    expect(scrollAfter('PUSH', list, at('k4', '/jokes', '?topic=t2'), memory)).toBeNull()
    expect(scrollAfter('REPLACE', at('k5', '/shows'), at('k6', '/shows', '?log=1'), memory)).toBeNull()
    expect(scrollAfter('POP', null, list, memory)).toBeNull()
  })

  it('goes back up one level only: a joke is not the list of its rewrite', () => {
    const memory = newMemory()
    remember(memory, joke, 640)
    const rewrite = at('k7', '/jokes/j1/rewrite')
    expect(scrollAfter('PUSH', rewrite, at('k8', '/jokes/j1', '?topic=t1'), memory)).toBe(640)
    expect(scrollAfter('PUSH', at('k9', '/craft/n1'), at('k10', '/craft/area/a1'), memory)).toBe(0)
  })
})
