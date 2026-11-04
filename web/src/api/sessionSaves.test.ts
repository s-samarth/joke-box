/**
 * A session's copy on this device after a save: what was saved, never an older copy that a
 * fetch brought in meanwhile (which would then pass for current and be saved over the newer
 * handwriting). And a session too big for the server is refused here, once. Made-up material.
 */
import { MutationObserver, onlineManager } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryClient, saveSessionKey, sessionKey, toSummary, type SaveSessionVars } from './queryClient'
import { MAX_STROKES } from './sessionLimits'
import { readSession } from './sessions'
import type { Stroke, WritingSession } from './types'
import { listUnsynced } from './unsynced'

const strokes = (n: number): Stroke[] => Array.from({ length: n }, () => ({ color: '#fff', size: 2, page: 0, points: [[1, 2, 0.5]] }))
const session = (ink: number, updated_at = '2026-01-01T00:00:00Z'): WritingSession => ({
  id: 's1', title: 'Fake', content: '', ink: strokes(ink), ink_pages: 1, timer_seconds: 0, joke_ids: [], observation_ids: [],
  technique_id: null, created_at: '2026-01-01T00:00:00Z', updated_at,
})
const save = (ink: number) => new MutationObserver<unknown, Error, SaveSessionVars>(queryClient, { mutationKey: saveSessionKey })
  .mutate({ id: 's1', input: session(ink) }).catch(() => {})
const here = () => queryClient.getQueryData<WritingSession>(sessionKey('s1'))
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

/** A server whose answers wait until `answer()` is called. */
function slowServer() {
  const waiting: (() => void)[] = []
  const fetched: string[] = []
  vi.stubGlobal('fetch', (path: string, init?: RequestInit) => {
    fetched.push(`${init?.method ?? 'GET'} ${path}`)
    return new Promise<Response>((resolve) => waiting.push(() => resolve(Response.json(toSummary(session(0, '2026-05-05T05:05:05Z'))))))
  })
  return { fetched, answer: () => waiting.shift()?.() }
}

afterEach(() => {
  queryClient.getMutationCache().clear()
  queryClient.clear()
  onlineManager.setOnline(true)
  vi.unstubAllGlobals()
})

describe('a session saving', () => {
  it('keeps what was saved, not an older copy fetched meanwhile', async () => {
    const server = slowServer()
    const saving = save(3)
    await tick()
    queryClient.setQueryData(sessionKey('s1'), session(1)) // an older copy lands while it's on its way
    server.answer()
    await saving
    expect(here()?.ink).toHaveLength(3)
    expect(here()?.updated_at).toBe('2026-05-05T05:05:05Z')
  })

  it("leaves a newer save's copy alone when an older one answers", async () => {
    const server = slowServer()
    const first = save(3)
    await tick()
    const second = save(5) // waits behind the first
    await tick()
    server.answer()
    await first
    expect(here()?.ink).toHaveLength(5)
    await vi.waitFor(() => expect(server.fetched).toHaveLength(2))
    server.answer()
    await second
  })

  it("isn't fetched while its save waits: the copy here is the newer one", async () => {
    onlineManager.setOnline(false)
    void save(4)
    await tick()
    const fetched: string[] = []
    vi.stubGlobal('fetch', async (path: string) => { fetched.push(path); return Response.json(session(1)) })
    expect((await readSession(queryClient, 's1'))?.ink).toHaveLength(4)
    expect(fetched).toEqual([])
  })

  it('is refused here when too big for the server, and kept once in Couldn\'t sync', async () => {
    const fetched: string[] = []
    vi.stubGlobal('fetch', async (path: string) => { fetched.push(path); return Response.json({}) })
    await save(MAX_STROKES + 1)
    await save(MAX_STROKES + 2)
    expect(fetched).toEqual([])
    await vi.waitFor(() => expect(listUnsynced().filter((i) => i.key[0] === 'session')).toHaveLength(1))
    expect((listUnsynced()[0].variables as SaveSessionVars).input.ink).toHaveLength(MAX_STROKES + 2)
  })
})
