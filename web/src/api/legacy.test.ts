import { describe, expect, it } from 'vitest'
import { renamedKey } from './legacy'
import { summary } from './unsynced'

describe('names from before jokes were renamed', () => {
  it("names an old save in Couldn't sync as a joke", () => {
    expect(renamedKey(['bit', 'save'])).toEqual(['joke', 'save'])
    expect(summary(['bit', 'save'], { input: { setup: 'Fake setup' } })).toEqual({ title: 'Joke', text: 'Fake setup' })
    expect(summary(['bit', 'delete'], 'j1').title).toBe('Delete joke')
  })
})
