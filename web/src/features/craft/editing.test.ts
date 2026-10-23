import { describe, expect, it } from 'vitest'
import { insertAfter, linesOf, replaceBlock } from './blockEdit'
import { parseBody, parseSpans } from './bodyFormat'
import { continueLine, indentItems, insertBlock, setLineKind, toggleBold } from './editText'
import { readTable, writeTable } from './tableText'

/** Text with a "|" marking the cursor, for writing selections in tests. */
const at = (s: string): [string, number] => [s.replace('|', ''), s.indexOf('|')]

describe('toolbar edits', () => {
  it('turns lines into list items, and back', () => {
    const v = 'fake one\nfake two'
    const listed = setLineKind(v, 0, v.length, 'list')
    expect(listed.value).toBe('- fake one\n- fake two')
    expect(setLineKind(listed.value, 0, listed.value.length, 'list').value).toBe(v)
  })

  it('swaps one kind of line for another and numbers lists', () => {
    expect(setLineKind('- [ ] a\n- [x] b', 0, 15, 'numbered').value).toBe('1. a\n2. b')
    expect(setLineKind('  - inner', 0, 9, 'tick').value).toBe('  - [ ] inner')
    expect(setLineKind('  - inner', 0, 0, 'heading').value).toBe('## inner')
  })

  it('formats an empty line, keeping the cursor after the mark', () => {
    const [v, c] = at('fake\n|')
    expect(setLineKind(v, c, c, 'callout')).toEqual({ value: 'fake\n> ', start: 7, end: 7 })
  })

  it('bolds and unbolds a selection', () => {
    expect(toggleBold('a fake b', 2, 6)).toEqual({ value: 'a **fake** b', start: 4, end: 8 })
    expect(toggleBold('a **fake** b', 4, 8)).toEqual({ value: 'a fake b', start: 2, end: 6 })
    expect(toggleBold('ab', 1, 1)).toEqual({ value: 'a****b', start: 3, end: 3 })
  })

  it('puts a block on its own lines with blank lines round it', () => {
    expect(insertBlock('fake', 4, 4, '---').value).toBe('fake\n\n---')
    expect(insertBlock('a\nb', 2, 2, '---').value).toBe('a\n\n---\n\nb')
    expect(insertBlock('', 0, 0, 'x → y', [0, 5])).toEqual({ value: 'x → y', start: 0, end: 5 })
  })
})

describe('list keys', () => {
  it('Enter carries the list on', () => {
    const [v, c] = at('- fake|')
    expect(continueLine(v, c, c)).toEqual({ value: '- fake\n- ', start: 9, end: 9 })
    const [t, tc] = at('  - [x] done|')
    expect(continueLine(t, tc, tc)?.value).toBe('  - [x] done\n  - [ ] ')
    const [n, nc] = at('9. nine|')
    expect(continueLine(n, nc, nc)?.value).toBe('9. nine\n10. ')
  })

  it('Enter on an empty item ends the list, and plain lines are left to the browser', () => {
    const [v, c] = at('- fake\n- |')
    expect(continueLine(v, c, c)).toEqual({ value: '- fake\n', start: 7, end: 7 })
    const [p, pc] = at('plain|')
    expect(continueLine(p, pc, pc)).toBeNull()
  })

  it('Tab indents list items only', () => {
    expect(indentItems('- a\n- b', 4, 7, false)?.value).toBe('- a\n  - b')
    expect(indentItems('  - b', 4, 4, true)).toEqual({ value: '- b', start: 2, end: 2 })
    expect(indentItems('plain', 0, 0, false)).toBeNull()
  })
})

describe('tables as boxes', () => {
  it('reads a table and writes it back', () => {
    const text = '| Fake | Col |\n|---|---|\n| a | **b** |'
    const data = readTable(text)
    expect(data).toEqual({ head: ['Fake', 'Col'], rows: [['a', '**b**']] })
    expect(writeTable(data)).toBe(text)
  })

  it('pads short rows, drops empty ones and keeps cells to one line', () => {
    const out = writeTable({ head: null, rows: [['a | b', 'two\nlines'], ['', ''], ['c']] })
    expect(out).toBe('| a / b | two lines |\n| c |  |')
    expect(writeTable({ head: ['', ''], rows: [['a']] })).toBe('| a |  |')
    expect(parseBody(out)).toEqual([{ type: 'table', head: [], rows: [['a / b', 'two lines'], ['c', '']] }])
  })
})

describe('editing one block', () => {
  const BODY = ['# Fake', 'Para one', 'goes on.', '', '- a', '', '- b', '| x | y |', '> tip'].join('\n')

  it('knows which lines each block came from', () => {
    expect(parseSpans(BODY).map((s) => [s.block.type, s.from, s.to])).toEqual([
      ['heading', 0, 0], ['para', 1, 2], ['list', 4, 6], ['table', 7, 7], ['quote', 8, 8],
    ])
  })

  it('replaces a block, even after the note shifted under it', () => {
    const place = { from: 1, to: 2, text: linesOf(BODY, 1, 2) }
    expect(replaceBlock(BODY, place, 'New para')?.split('\n').slice(0, 3)).toEqual(['# Fake', 'New para', ''])
    const shifted = `- [ ] new tick\n\n${BODY}`
    expect(replaceBlock(shifted, place, 'New para')?.split('\n')[3]).toBe('New para')
    expect(replaceBlock('something else', place, 'x')).toBeNull()
  })

  it('takes a block out without leaving a double gap', () => {
    const body = 'a\n\nb\n\nc'
    expect(replaceBlock(body, { from: 2, to: 2, text: 'b' }, '  ')).toBe('a\n\nc')
    expect(replaceBlock(body, { from: 0, to: 0, text: 'a' }, '')).toBe('b\n\nc')
  })

  it('adds a block after another with blank lines round it', () => {
    expect(insertAfter('a\nb', 0, 'new')).toBe('a\n\nnew\n\nb')
    expect(insertAfter('a', 0, 'new\n')).toBe('a\n\nnew')
    expect(insertAfter('', -1, '## Fake')).toBe('## Fake')
  })
})
