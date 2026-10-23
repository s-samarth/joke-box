/**
 * A save waiting on a phone is stored with its key, and finds its save function by that key when
 * it's sent. A release that renamed a key or changed the cache buster would strand those saves.
 */
import { describe, expect, it } from 'vitest'
import './jokeSaves'
import './craft'
import { CACHE_BUSTER, persistMaxAge, queryClient } from './queryClient'
import './showSaves'
import './study'
import './trash'
import './voice'
import './board'

/** Every key ever shipped for a queued save. Add new ones; never remove or rename one. */
const SHIPPED = [
  'bit/save', 'bit/delete', 'joke/save', 'joke/delete', 'observation/save', 'observation/delete', 'session/save', 'session/delete',
  'watch/save', 'watch/delete', 'analysis/save', 'analysis/delete', 'craft/save', 'craft/delete',
  'log/save', 'log/delete', 'setlist/save', 'setlist/delete', 'brainstorm/save', 'brainstorm/delete',
  'brainstorm-version/delete', 'voice/save', 'voice/delete', 'trash/restore', 'trash/erase', 'trash/empty',
  'board/save', 'board/tidy',
]

describe('saves waiting on phones', () => {
  it.each(SHIPPED)('%s can still be sent, in the queue', (key) => {
    const defaults = queryClient.getMutationDefaults(key.split('/'))
    expect(defaults.mutationFn).toBeTypeOf('function')
    expect(defaults.scope?.id).toBe('sync')
  })

  it("keeps the saved copy, so waiting saves aren't thrown away", () => {
    expect(CACHE_BUSTER).toBe('v1')
    expect(persistMaxAge).toBe(Infinity)
  })
})
