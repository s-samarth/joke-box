import { describe, expect, it } from 'vitest'
import { bitrateFor, filterNotes, hashtagCounts, megabytes, pickMimeType } from './voiceMeta'

const notes = [
  { label: 'Fake airport idea', hashtags: ['#travel'] },
  { label: 'Fake landlord rant', hashtags: ['#home', '#money'] },
  { label: '', hashtags: ['#travel', '#money'] },
]

describe('pickMimeType', () => {
  it('prefers WebM/Opus where the browser records it', () => {
    expect(pickMimeType(() => true)).toBe('audio/webm;codecs=opus')
  })
  it('uses MP4 where WebM recording is missing (Safari)', () => {
    expect(pickMimeType((t) => t.startsWith('audio/mp4'))).toBe('audio/mp4;codecs=mp4a.40.2')
  })
  it('skips a format that recorded nothing before', () => {
    expect(pickMimeType(() => true, ['audio/webm'])).toBe('audio/mp4;codecs=mp4a.40.2')
  })
  it('returns undefined when nothing is supported', () => {
    expect(pickMimeType(() => false)).toBeUndefined()
  })
})

describe('bitrateFor', () => {
  it('gives AAC (iPhone) more bits than Opus', () => {
    expect(bitrateFor('audio/mp4;codecs=mp4a.40.2')).toBe(64_000)
    expect(bitrateFor('audio/webm;codecs=opus')).toBe(48_000)
    expect(bitrateFor(undefined)).toBe(48_000)
  })
})

describe('filterNotes', () => {
  it('matches labels and hashtags, needing every word', () => {
    expect(filterNotes(notes, 'travel')).toHaveLength(2)
    expect(filterNotes(notes, 'travel money')).toEqual([notes[2]])
    expect(filterNotes(notes, 'LANDLORD')).toEqual([notes[1]])
  })
  it('returns everything for an empty search', () => {
    expect(filterNotes(notes, '  ')).toBe(notes)
  })
})

describe('hashtagCounts', () => {
  it('counts hashtags, most used first', () => {
    expect(hashtagCounts(notes)).toEqual([['#money', 2], ['#travel', 2], ['#home', 1]])
  })
})

describe('megabytes', () => {
  it('shows one decimal for small sizes', () => {
    expect(megabytes(2_400_000)).toBe('2.4 MB')
    expect(megabytes(345_000_000)).toBe('345 MB')
  })
})
