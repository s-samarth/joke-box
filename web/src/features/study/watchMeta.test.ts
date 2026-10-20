import { describe, expect, it } from 'vitest'
import type { WatchItem } from '../../api/types'
import { OWN_CATEGORY, filterItems, groupByCategory, nextPosition, watchUrl } from './watchMeta'

const item = (over: Partial<WatchItem>): WatchItem => ({
  id: Math.random().toString(), title: 'Fake Bit', comedian: 'Fake Comic', category: 'Fake Logicians', description: '',
  url: '', position: 1, schemer_index: null, logic_density: null, dark_pragmatism: null, watched: false,
  created_at: '2026-10-21T00:00:00Z', updated_at: '2026-10-21T00:00:00Z', ...over,
})

const items = [
  item({ title: 'Fake Airport', position: 1, watched: true }),
  item({ title: 'Fake Planet', position: 2 }),
  item({ title: 'Fake Hostel', category: 'Fake Weavers', comedian: 'Other Comic', position: 3 }),
  item({ title: 'Mine', category: '', position: 4 }),
]

describe('filterItems', () => {
  it('splits to-watch from watched', () => {
    expect(filterItems(items, 'todo', '')).toHaveLength(3)
    expect(filterItems(items, 'watched', '').map((i) => i.title)).toEqual(['Fake Airport'])
  })
  it('searches title, comic and category with every word', () => {
    expect(filterItems(items, 'all', 'other hostel')).toHaveLength(1)
    expect(filterItems(items, 'all', 'weavers')).toHaveLength(1)
  })
})

describe('groupByCategory', () => {
  it('keeps category order, counts all items, shows only filtered ones', () => {
    const groups = groupByCategory(items, filterItems(items, 'todo', ''))
    expect(groups.map((g) => g.category)).toEqual(['Fake Logicians', 'Fake Weavers', OWN_CATEGORY])
    expect(groups[0]).toMatchObject({ watched: 1, total: 2 })
    expect(groups[0].items.map((i) => i.title)).toEqual(['Fake Planet'])
  })
  it('drops categories with nothing to show', () => {
    expect(groupByCategory(items, filterItems(items, 'watched', '')).map((g) => g.category)).toEqual(['Fake Logicians'])
  })
})

describe('watchUrl', () => {
  it('uses your own link when there is one', () => {
    expect(watchUrl({ url: 'https://example.com/x', title: 'A', comedian: 'B' })).toBe('https://example.com/x')
  })
  it('otherwise searches YouTube for the comic and routine', () => {
    expect(watchUrl({ url: '', title: 'Fake & Bit', comedian: 'Fake Comic' })).toBe(
      'https://www.youtube.com/results?search_query=Fake%20Comic%20Fake%20%26%20Bit%20stand%20up',
    )
  })
})

describe('nextPosition', () => {
  it('puts a new routine after the last one', () => {
    expect(nextPosition(items)).toBe(5)
    expect(nextPosition([])).toBe(1)
  })
})
