import { describe, expect, it } from 'vitest'
import { summary } from './unsynced'

describe("what a save that couldn't sync shows", () => {
  it('shows the words you wrote, in reading order, ready to copy', () => {
    expect(summary(['joke', 'save'], { id: 'x', input: { setup: 'Setup line', punchline: 'Punch line', comments: '' } }))
      .toEqual({ title: 'Joke', text: 'Setup line\nPunch line' })
    expect(summary(['log', 'save'], { id: 'x', input: { venue_name: 'Garage', notes: 'Crowd was cold', rating: 3 } }))
      .toEqual({ title: 'Show', text: 'Garage\nCrowd was cold' })
  })

  it('names a delete without text', () => {
    expect(summary(['setlist', 'delete'], 'some-id')).toEqual({ title: 'Delete set', text: '' })
  })

  it('copes with something it has no name for', () => {
    expect(summary(['future', 'save'], { input: { title: 'T' } })).toEqual({ title: 'Change', text: 'T' })
  })
})
