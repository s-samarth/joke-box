import { describe, expect, it } from 'vitest'
import { countByPremise, jokesOn, premiseSize } from './premises'

const joke = (id: string, at: string, premise_id: string | null, follows_id: string | null = null) => ({ id, created_at: `2026-10-${at}`, premise_id, follows_id })

describe('jokesOn', () => {
  it('keeps a chain together, oldest first', () => {
    const jokes = [
      joke('c', '03', 'p', 'a'),
      joke('b', '02', 'p'),
      joke('a', '01', 'p'),
      joke('x', '01', 'other'),
    ]
    expect(jokesOn('p', jokes).map((j) => j.id)).toEqual(['a', 'c', 'b'])
  })

  it('starts a chain at its first joke on the premise', () => {
    const jokes = [joke('a', '01', null), joke('b', '02', 'p', 'a'), joke('c', '03', 'p', 'b')]
    expect(jokesOn('p', jokes).map((j) => j.id)).toEqual(['b', 'c'])
  })
})

describe('premise counts', () => {
  it('counts jokes per premise and names the size', () => {
    const counts = countByPremise([joke('a', '01', 'p'), joke('b', '02', 'p'), joke('c', '03', null)])
    expect(Object.fromEntries(counts)).toEqual({ p: 2 })
    expect([0, 1, 2, 3].map(premiseSize)).toEqual(['No jokes yet', '1 joke', '2 jokes', '3 jokes, a bit'])
  })
})
