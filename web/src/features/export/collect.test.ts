import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/client'
import { NetworkError } from '../../api/network'
import { LISTS, audioExtension, collect, fileName, type Progress, type Sources } from './collect'

/** A made-up JokeBox: one of everything, two sessions and two voice notes (one not uploaded). */
const data: Record<string, unknown> = {
  '/api/jokes': [{ id: 'j1', setup: 'A made-up setup' }],
  '/api/sessions/summaries': [
    { id: 'aaaaaaaa-1111', title: 'Fake: airports', created_at: '2026-10-01T10:00:00Z' },
    { id: 'bbbbbbbb-2222', title: 'a/b: c?', created_at: '2026-10-02T10:00:00Z' },
  ],
  '/api/sessions/aaaaaaaa-1111': { id: 'aaaaaaaa-1111', ink: [{ points: [[1, 2, 0.5]] }] },
  '/api/sessions/bbbbbbbb-2222': { id: 'bbbbbbbb-2222', ink: [] },
  '/api/voice-notes': [
    { id: 'cccccccc-3333', label: 'Bus idea', content_type: 'audio/mp4', has_audio: true, created_at: '2026-10-03T09:00:00Z' },
    { id: 'dddddddd-4444', label: 'Still uploading', content_type: 'audio/webm', has_audio: false, created_at: '2026-10-04T09:00:00Z' },
  ],
}

function fake(audio: (id: string) => Promise<Blob> = async () => new Blob([new Uint8Array([1, 2, 3])])): Sources & { asked: string[] } {
  const asked: string[] = []
  return {
    asked,
    json: async (path) => {
      asked.push(path)
      return data[path] ?? []
    },
    audio,
  }
}

/** The names in a ZIP's central directory, read from the end record. */
async function names(file: Blob): Promise<string[]> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const view = new DataView(bytes.buffer)
  const end = bytes.length - 22
  let at = view.getUint32(end + 16, true)
  return Array.from({ length: view.getUint16(end + 10, true) }, () => {
    const length = view.getUint16(at + 28, true)
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + length))
    at += 46 + length
    return name
  })
}

describe('collect', () => {
  it('reads every list, each session in full and each uploaded recording', async () => {
    const sources = fake()
    const steps: Progress[] = []
    const archive = await collect(sources, (p) => steps.push(p), undefined, new Date('2026-11-03T21:30:00Z'))
    expect(new Set(sources.asked)).toEqual(new Set([...LISTS.map(([, path]) => path), '/api/sessions/aaaaaaaa-1111', '/api/sessions/bbbbbbbb-2222']))
    const files = await names(archive.file)
    expect(files[0]).toBe('README.txt')
    expect(files).toContain('jokes.json')
    expect(files).toContain('brainstorm-sessions/2026-10-01 Fake airports (aaaaaaaa).json')
    expect(files).toContain('brainstorm-sessions/2026-10-02 a b c (bbbbbbbb).json')
    expect(files).toContain('voice-notes/2026-10-03 Bus idea (cccccccc).m4a')
    expect(files.filter((f) => f.startsWith('voice-notes/'))).toHaveLength(1) // the one still uploading is skipped
    expect(archive.name).toBe('jokebox-2026-11-03.zip')
    expect(archive.missing).toEqual([])
    expect(steps.at(-1)).toMatchObject({ done: LISTS.length + 3, total: LISTS.length + 3 })
  })

  it('notes a recording the server has lost and keeps the rest', async () => {
    const archive = await collect(fake(async () => Promise.reject(new ApiError(404, 'Recording not found'))), () => {})
    expect(archive.missing).toEqual(['voice-notes/2026-10-03 Bus idea (cccccccc).m4a'])
    expect(await names(archive.file)).not.toContain('voice-notes/2026-10-03 Bus idea (cccccccc).m4a')
  })

  it('stops when the signal drops or you are signed out', async () => {
    await expect(collect(fake(async () => Promise.reject(new NetworkError())), () => {})).rejects.toBeInstanceOf(NetworkError)
    await expect(collect(fake(async () => Promise.reject(new ApiError(401, 'Sign in'))), () => {})).rejects.toBeInstanceOf(ApiError)
  })

  it('fails as soon as one list fails, with no progress after', async () => {
    const sources = fake()
    const slowly: Sources = {
      ...sources,
      json: async (path) => {
        if (path === '/api/craft-notes') throw new NetworkError()
        await new Promise((r) => setTimeout(r, 5))
        return sources.json(path)
      },
    }
    let settled = false
    const late: Progress[] = []
    await expect(collect(slowly, (p) => settled && late.push(p), undefined).finally(() => (settled = true))).rejects.toBeInstanceOf(NetworkError)
    await new Promise((r) => setTimeout(r, 50)) // let the requests still in flight finish
    expect(late).toEqual([])
    expect(sources.asked.length).toBeLessThan(LISTS.length) // the rest weren't started
  })

  it('stops when cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(collect(fake(), () => {}, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('file names', () => {
  it('are safe everywhere and keep the id so two notes never clash', () => {
    expect(fileName('2026-10-01T10:00:00Z', 'what? <now>: a/b', 'abcdef123456')).toBe('2026-10-01 what now a b (abcdef12)')
    expect(fileName('2026-10-01T10:00:00Z', '', 'abcdef123456')).toBe('2026-10-01 (abcdef12)')
    expect(audioExtension('audio/mp4;codecs=mp4a.40.2')).toBe('m4a')
    expect(audioExtension('audio/x-unknown')).toBe('audio')
  })
})
