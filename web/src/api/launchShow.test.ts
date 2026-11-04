/**
 * A save written to the phone before it showed in the lists must show again at launch: a joke
 * editor opened on the older text would otherwise send that back over the newer one.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('idb-keyval', () => ({ get: async () => undefined, set: async () => {}, del: async () => {}, createStore: () => ({}) }))

const { saveJokeKey } = await import('./jokeSaves')
const { showWaitingSaves } = await import('./launch')
const { keys, queryClient } = await import('./queryClient')

describe('waiting saves at launch', () => {
  it('show in the lists again, oldest first', async () => {
    const old = { id: 'j1', setup: 'Old made-up setup', version: 1, created_at: '2026-01-01', updated_at: '2026-01-01' }
    queryClient.setQueryData(keys.jokes, [old])
    for (const setup of ['Newer made-up setup', 'Newest made-up setup']) {
      const variables = { id: 'j1', input: { ...old, setup } }
      queryClient.getMutationCache().build(queryClient, { mutationKey: saveJokeKey }, { status: 'pending', variables } as never)
    }
    await showWaitingSaves()
    const jokes = queryClient.getQueryData<{ id: string; setup: string }[]>(keys.jokes)
    expect(jokes?.map((j) => j.setup)).toEqual(['Newest made-up setup'])
  })
})
