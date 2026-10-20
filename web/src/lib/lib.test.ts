import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import { clock, long, parse } from './duration'
import { fromIstInput, toIstInput } from './time'

describe('duration', () => {
  it('formats', () => {
    expect(clock(150)).toBe('2:30')
    expect(clock(5)).toBe('0:05')
    expect(clock(3725)).toBe('1:02:05')
    expect(long(150)).toBe('2m 30s')
    expect(long(3900)).toBe('1h 05m')
  })

  it('parses what people type', () => {
    expect(parse('2:30')).toBe(150)
    expect(parse('2m 30s')).toBe(150)
    expect(parse('45s')).toBe(45)
    expect(parse('3m')).toBe(180)
    expect(parse('90')).toBe(90)
    expect(parse('')).toBe(0)
    expect(parse('soon')).toBeNull()
  })
})

describe('IST conversion', () => {
  it('round-trips through the datetime input', () => {
    expect(toIstInput('2026-10-01T15:00:00Z')).toBe('2026-10-01T20:30')
    expect(new Date(fromIstInput('2026-10-01T20:30')).toISOString()).toBe('2026-10-01T15:00:00.000Z')
  })
})

describe('csv', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(toCsv(['a', 'b'], [['x, y', 'say "hi"\nok']])).toBe('a,b\n"x, y","say ""hi""\nok"')
  })
})
