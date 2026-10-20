import { describe, expect, it } from 'vitest'
import { filterNotes, hashtagCounts, megabytes, pickMimeType } from './voiceMeta'

const notes = [
  { label: 'Fake airport idea', hashtags: ['#travel'] },
  { label: 'Fake landlord rant', hashtags: ['#home', '#money'] },
  { label: '', hashtags: ['#travel', '#money'] },
]

describe('pickMimeType', () => {
  it('prefers MP4 so recordings play on iPhone', () => {
    expect(pickMimeType(() => true)).toBe('audio/mp4;codecs=mp4a.40.2')
  })
  it('falls back to WebM where MP4 recording is missing', () => {
    expect(pickMimeType((t) => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus')
  })
  it('returns undefined when nothing is supported', () => {
    expect(pickMimeType(() => false)).toBeUndefined()
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
