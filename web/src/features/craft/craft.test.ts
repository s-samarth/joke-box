import { describe, expect, it } from 'vitest'
import { areaColor, areaFor, blankNote, groupByArea, kindFor, matches, nextColor, notesFor, plainText } from './craftMeta'
import { inlineRuns, listItems, parseBody, prompts, toggleTick } from './bodyFormat'
import type { CraftArea, CraftNote, NoteKind } from '../../api/types'

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

  it('splits bold runs and web addresses', () => {
    expect(inlineRuns('a **b** c')).toEqual([{ text: 'a ', bold: false }, { text: 'b', bold: true }, { text: ' c', bold: false }])
    expect(inlineRuns('See https://example.com/fake.')).toEqual([
      { text: 'See ', bold: false }, { text: 'https://example.com/fake', bold: false, href: 'https://example.com/fake' }, { text: '.', bold: false },
    ])
    expect(inlineRuns('javascript:alert(1)').every((r) => !r.href)).toBe(true)
  })

  it('lists top-level items and prompts', () => {
    expect(listItems(BODY).map((i) => i.text)).toEqual(['one', 'two', 'first', 'second'])
    const technique = '## How\n- step\n## Prompts\n- If I were God…\n- It is just like…\n## Tips\n- tip'
    expect(prompts(technique)).toEqual(['If I were God…', 'It is just like…'])
    expect(prompts('- no prompts here')).toEqual([])
  })
})

const note = (patch: Partial<CraftNote>): CraftNote => ({
  id: 'x', title: 'Fake', body: '', behaviour: 'reference', kind_id: 'k', area_id: 'w', hashtags: [], source: '', url: '', position: 1, performance_log_id: null, analysis_id: null, created_at: '', updated_at: '', ...patch,
})

const area = (id: string, screens: CraftArea['screens'] = []): CraftArea => ({ id, name: `Fake ${id}`, description: '', color: 'sky', screens, position: 0 })
const AREAS = [area('w', ['rewrite']), area('r', ['rewrite', 'stage']), area('s', ['sets'])]

describe('craft meta', () => {
  it('groups by area in your order, keeping empty areas', () => {
    const groups = groupByArea([note({ id: 'a', area_id: 'r' }), note({ id: 'b', area_id: 'w' })], AREAS)
    expect(groups.map((g) => [g.area.id, g.notes.map((n) => n.id)])).toEqual([['w', ['b']], ['r', ['a']], ['s', []]])
  })

  it('picks the notes for a screen from the areas that show there', () => {
    const all = [note({ id: 'n1', area_id: 'r', behaviour: 'checklist', position: 9 }), note({ id: 'n2', area_id: 'w', behaviour: 'checklist' }), note({ id: 'n3', area_id: 'r' }), note({ id: 'n4', area_id: 's', behaviour: 'checklist' })]
    expect(notesFor(all, AREAS, 'rewrite', ['checklist']).map((n) => n.id)).toEqual(['n2', 'n1'])
    expect(notesFor(all, AREAS, 'stage').map((n) => n.id)).toEqual(['n3', 'n1'])
    expect(areaFor(AREAS, 'stage')).toBe('r')
    expect(areaFor(AREAS)).toBe('w')
  })

  it('colours: presets, any hex, and a fresh colour for each new area', () => {
    expect(areaColor('sky')).toBe('#7cc4f5')
    expect(areaColor('#123abc')).toBe('#123abc')
    expect(areaColor('nonsense')).toBe('#7cc4f5')
    expect(nextColor(AREAS)).toBe('violet') // sky is taken by the fake areas
    const lots = Array.from({ length: 30 }, (_, i) => ({ ...area(`a${i}`), color: ['sky', 'violet', 'emerald', 'orange', 'rose', 'pink', 'amber', 'teal', 'lime', 'indigo', 'coral', 'slate'][i % 12] }))
    expect(nextColor(lots)).toBeTruthy() // never runs out
  })

  it('picks a kind by behaviour, else your first kind', () => {
    const kinds: NoteKind[] = [{ id: 'q', name: 'Quote', behaviour: 'reference', position: 0 }, { id: 'c', name: 'Fake list', behaviour: 'checklist', position: 1 }]
    expect(kindFor(kinds, 'checklist')).toBe('c')
    expect(kindFor(kinds, 'path')).toBe('q')
  })

  it('strips formatting for previews', () => {
    expect(plainText('# Head\n- **Bold** item\n- [x] done')).toBe('Head Bold item done')
  })

  it('searches every word and sorts new notes last', () => {
    expect(matches(note({ title: 'Fake setup', hashtags: ['#webs'] }), 'setup webs')).toBe(true)
    expect(matches(note({ title: 'Fake' }), 'hecklers')).toBe(false)
    expect(blankNote([note({ position: 7 })], { area_id: 's', kind_id: 'k' })).toMatchObject({ position: 8, area_id: 's' })
  })
})
