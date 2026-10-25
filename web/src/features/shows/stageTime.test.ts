import { describe, expect, it } from 'vitest'
import { stageSeconds, toStageTime } from './stageTime'

describe('stage time', () => {
  it('reads minutes alone, seconds alone and both', () => {
    expect(stageSeconds({ min: '10', sec: '' })).toBe(600)
    expect(stageSeconds({ min: '', sec: '45' })).toBe(45)
    expect(stageSeconds({ min: '6', sec: '30' })).toBe(390)
    expect(stageSeconds({ min: '', sec: '' })).toBe(0)
  })
  it('fills the boxes from a saved show', () => {
    expect(toStageTime(390)).toEqual({ min: '6', sec: '30' })
    expect(toStageTime(600)).toEqual({ min: '10', sec: '' })
  })
})
