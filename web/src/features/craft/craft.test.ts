import { describe, expect, it } from 'vitest'
import { groupByArea, matches, blankNote } from './craftMeta'
import { inlineRuns, listItems, parseBody, prompts, toggleTick } from './bodyFormat'
import type { CraftNote } from '../../api/types'

const BODY = ['# Fake heading', 'A fake line', 'goes on.', '', '- one', '  - one inside', '- [x] two', '1. first', '2. second'].join('\n')

describe('note body', () => {
  it('reads headings, paragraphs and lists', () => {
    const blocks = parseBody(BODY)
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'para', 'list', 'list'])
    expect(blocks[1]).toEqual({ type: 'para', text: 'A fake line\ngoes on.' })
    const list = blocks[2]
    expect(list.type === 'list' && list.items.map((i) => [i.text, i.checked, i.nested])).toEqual([
      ['one', null, false], ['one inside', null, true], ['two', true, false],
    ])
    expect(blocks[3].type === 'list' && blocks[3].ordered).toBe(true)
  })

  it('flips a tick box and leaves other lines alone', () => {
    expect(toggleTick('- [ ] a\n- b', 0)).toBe('- [x] a\n- b')
    expect(toggleTick('- [x] a', 0)).toBe('- [ ] a')
    expect(toggleTick('- b', 0)).toBe('- b')
  })

  it('splits bold runs', () => {
    expect(inlineRuns('a **b** c')).toEqual([{ text: 'a ', bold: false }, { text: 'b', bold: true }, { text: ' c', bold: false }])
  })

  it('lists top-level items and prompts', () => {
    expect(listItems(BODY).map((i) => i.text)).toEqual(['one', 'two', 'first', 'second'])
    const technique = '## How\n- step\n## Prompts\n- If I were God…\n- It is just like…\n## Tips\n- tip'
    expect(prompts(technique)).toEqual(['If I were God…', 'It is just like…'])
    expect(prompts('- no prompts here')).toEqual([])
  })
})

const note = (patch: Partial<CraftNote>): CraftNote => ({
  id: 'x', title: 'Fake', body: '', kind: 'reference', area: 'writing', hashtags: [], source: '', url: '', position: 1, created_at: '', updated_at: '', ...patch,
})

describe('craft meta', () => {
  it('groups by area in the fixed order', () => {
    const groups = groupByArea([note({ id: 'a', area: 'stage' }), note({ id: 'b', area: 'writing' })])
    expect(groups.map((g) => g.area.key)).toEqual(['writing', 'stage'])
  })

  it('searches every word and sorts new notes last', () => {
    expect(matches(note({ title: 'Fake setup', hashtags: ['#webs'] }), 'setup webs')).toBe(true)
    expect(matches(note({ title: 'Fake' }), 'hecklers')).toBe(false)
    expect(blankNote([note({ position: 7 })], { area: 'stage' })).toMatchObject({ position: 8, area: 'stage' })
  })
})
