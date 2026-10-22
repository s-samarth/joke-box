import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { renamedKey, upgradeOldCache } from './legacy'
import { keys } from './queryClient'
import { summary } from './unsynced'

describe('names from before jokes were renamed', () => {
  it('moves a cache saved in the old shape onto the new names', () => {
    const client = new QueryClient()
    client.setQueryData(['bits'], [{ id: 'j1', setup: 'Fake setup' }])
    client.setQueryData(keys.setlists, [{ id: 's1', items: [{ bit_id: 'j1' }, { joke_id: 'j2' }] }])
    client.setQueryData(keys.brainstorms, [{ id: 'r1', bit_id: 'j1' }])
    client.setQueryData(keys.sessions, [{ id: 'w1', bit_ids: ['j1'] }])
    upgradeOldCache(client)
    expect(client.getQueryData(keys.jokes)).toEqual([{ id: 'j1', setup: 'Fake setup' }])
    expect(client.getQueryData(['bits'])).toBeUndefined()
    expect(client.getQueryData(keys.setlists)).toEqual([{ id: 's1', items: [{ bit_id: 'j1', joke_id: 'j1' }, { joke_id: 'j2' }] }])
    expect(client.getQueryData(keys.brainstorms)).toEqual([{ id: 'r1', bit_id: 'j1', joke_id: 'j1' }])
    expect(client.getQueryData(keys.sessions)).toEqual([{ id: 'w1', bit_ids: ['j1'], joke_ids: ['j1'] }])
  })

  it('leaves an up-to-date cache alone', () => {
    const client = new QueryClient()
    client.setQueryData(keys.jokes, [{ id: 'j2' }])
    client.setQueryData(['bits'], [{ id: 'j1' }])
    upgradeOldCache(client)
    expect(client.getQueryData(keys.jokes)).toEqual([{ id: 'j2' }])
  })

  it("names an old save in Couldn't sync as a joke", () => {
    expect(renamedKey(['bit', 'save'])).toEqual(['joke', 'save'])
    expect(summary(['bit', 'save'], { input: { setup: 'Fake setup' } })).toEqual({ title: 'Joke', text: 'Fake setup' })
    expect(summary(['bit', 'delete'], 'j1').title).toBe('Delete joke')
  })
})
