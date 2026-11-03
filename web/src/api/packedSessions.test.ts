/**
 * Sessions bigger than the host's 4.5 MB limit as plain JSON: big saves go gzip-packed, a whole
 * session comes back packed, the list comes without ink, and each session's ink is kept on the
 * device for offline.
 */
import { MutationObserver, onlineManager } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from './client'
import { PACKED_JSON, pack, unpack } from './packed'
import { keys, queryClient, saveSessionKey, sessionKey, type SaveSessionVars } from './queryClient'
import { keepOnDevice } from './sessions'
import type { SessionSummary, WritingSession } from './types'

const session = (id: string, updated_at = '2026-01-01T00:00:00Z', ink = 1): WritingSession => ({
  id, title: 'Fake', content: '', ink: Array.from({ length: ink }, () => ({ color: '#fff', size: 2, page: 0, points: [[1, 2, 0.5]] })),
  ink_pages: 1, timer_seconds: 0, joke_ids: [], observation_ids: [], technique_id: null, created_at: updated_at, updated_at,
})
const summary = ({ ink, ...rest }: WritingSession): SessionSummary => ({ ...rest, ink_strokes: ink.length })
const packedResponse = async (body: unknown) => new Response(await pack(JSON.stringify(body)), { headers: { 'content-type': PACKED_JSON } })
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
  queryClient.getMutationCache().clear()
  queryClient.clear()
  onlineManager.setOnline(true)
  vi.unstubAllGlobals()
})

describe('packed bodies', () => {
  it('sends a small save as plain JSON', async () => {
    const sent: RequestInit[] = []
    vi.stubGlobal('fetch', async (_: string, init: RequestInit) => { sent.push(init); return Response.json({}) })
    await api('/api/sessions/s1', 'PUT', { title: 'Fake' })
    expect((sent[0].headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(sent[0].body).toBe('{"title":"Fake"}')
  })

  it('packs a big save, and it unpacks to exactly what was sent', async () => {
    const sent: RequestInit[] = []
    vi.stubGlobal('fetch', async (_: string, init: RequestInit) => { sent.push(init); return Response.json({}) })
    const big = session('s1', undefined, 4000)
    await api('/api/sessions/s1', 'PUT', big)
    expect((sent[0].headers as Record<string, string>)['Content-Type']).toBe(PACKED_JSON)
    const body = sent[0].body as Blob
    expect(body.size).toBeLessThan(JSON.stringify(big).length / 3)
    expect(JSON.parse(await unpack(body.stream()))).toEqual(big)
  })

  it('reads a packed answer instead of taking it for a wifi sign-in page', async () => {
    vi.stubGlobal('fetch', async () => packedResponse(session('s1')))
    expect(await api<WritingSession>('/api/sessions/s1')).toEqual(session('s1'))
    expect(onlineManager.isOnline()).toBe(true)
  })

  it('says what to do when a session is too big even packed', async () => {
    vi.stubGlobal('fetch', async () => new Response('Request Entity Too Large', { status: 413 }))
    await expect(api('/api/sessions/s1', 'PUT', {})).rejects.toThrow(new ApiError(413, 'Too big to sync. Start a new session for more pages.'))
  })
})

describe('keeping sessions on the device', () => {
  it("downloads each session whose ink changed, and only those", async () => {
    queryClient.setQueryData(sessionKey('same'), session('same'))
    queryClient.setQueryData(sessionKey('old'), session('old'))
    const fetched: string[] = []
    vi.stubGlobal('fetch', async (path: string) => { fetched.push(path); return packedResponse(session(path.split('/').pop()!, '2026-02-01T00:00:00Z')) })
    await keepOnDevice(queryClient, [summary(session('same')), summary(session('old', '2026-02-01T00:00:00Z')), summary(session('new', '2026-02-01T00:00:00Z'))])
    expect(fetched).toEqual(['/api/sessions/old', '/api/sessions/new'])
    expect(queryClient.getQueryData<WritingSession>(sessionKey('new'))?.ink).toHaveLength(1)
  })

  it('leaves the copy here alone while a save is waiting to sync', async () => {
    onlineManager.setOnline(false)
    void new MutationObserver<unknown, Error, SaveSessionVars>(queryClient, { mutationKey: saveSessionKey }).mutate({ id: 's1', input: session('s1', undefined, 3) }).catch(() => {})
    await tick()
    const fetched: string[] = []
    vi.stubGlobal('fetch', async (path: string) => { fetched.push(path); return packedResponse(session('s1')) })
    await keepOnDevice(queryClient, [summary(session('s1', '2030-01-01T00:00:00Z'))])
    expect(fetched).toEqual([])
    expect(queryClient.getQueryData<WritingSession>(sessionKey('s1'))?.ink).toHaveLength(3)
  })

  it('forgets a session deleted on another device', async () => {
    queryClient.setQueryData(sessionKey('gone'), session('gone'))
    vi.stubGlobal('fetch', async () => packedResponse(session('x')))
    await keepOnDevice(queryClient, [])
    expect(queryClient.getQueryData(sessionKey('gone'))).toBeUndefined()
  })
})

describe('saving a session', () => {
  it("takes the server's time once saved, so the session isn't downloaded again", async () => {
    vi.stubGlobal('fetch', async () => Response.json({ ...summary(session('s1')), updated_at: '2026-05-05T05:05:05Z' }))
    await new MutationObserver<unknown, Error, SaveSessionVars>(queryClient, { mutationKey: saveSessionKey }).mutate({ id: 's1', input: session('s1') })
    expect(queryClient.getQueryData<WritingSession>(sessionKey('s1'))?.updated_at).toBe('2026-05-05T05:05:05Z')
  })

  it('updates the session and the list at once, and the list stays without ink', async () => {
    onlineManager.setOnline(false)
    queryClient.setQueryData(keys.sessionList, [summary(session('other'))])
    void new MutationObserver<unknown, Error, SaveSessionVars>(queryClient, { mutationKey: saveSessionKey }).mutate({ id: 's1', input: session('s1', undefined, 2) }).catch(() => {})
    await tick()
    expect(queryClient.getQueryData<WritingSession>(sessionKey('s1'))?.ink).toHaveLength(2)
    const list = queryClient.getQueryData<SessionSummary[]>(keys.sessionList)!
    expect(list.map((s) => s.id)).toEqual(['s1', 'other'])
    expect(list[0].ink_strokes).toBe(2)
    expect('ink' in list[0]).toBe(false)
  })
})
