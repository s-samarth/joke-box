/**
 * Sets and brainstorm sessions edited on two devices. A set's clash goes to Couldn't sync, with
 * Keep mine; a session's is kept as a copy, so no handwriting is ever thrown away. Made-up material.
 */
import { MutationObserver, onlineManager } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryClient, saveSessionKey, sessionKey, type SaveSessionVars } from './queryClient'
import { copyTitle, movedTo } from './sessionClash'
import './sessionSaves'
import { saveSetlistKey, type SaveSetlistVars } from './showSaves'
import type { SetlistInput } from './shows'
import type { WritingSession, WritingSessionInput } from './types'
import { listUnsynced, retryUnsynced } from './unsynced'

type Sent = { method: string; id: string; body: Record<string, unknown> }
let sent: Sent[] = []

/** A server holding versions per id: a save based on an older one is refused with 409. */
function serve(versions: Record<string, number>) {
  sent = []
  vi.stubGlobal('fetch', async (path: string, init: RequestInit) => {
    const id = path.split('/').pop() ?? ''
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    sent.push({ method: init.method ?? 'GET', id, body })
    const base = body.base_version
    if (base !== undefined && base !== versions[id]) {
      return Response.json({ detail: 'Changed on another device.' }, { status: 409 })
    }
    versions[id] = (versions[id] ?? 0) + 1
    const now = '2026-05-05T05:05:05Z'
    return Response.json({ ...body, id, items: [], ink_strokes: 0, version: versions[id], created_at: now, updated_at: now })
  })
}

const set = (version?: number, name = 'Fake set'): SetlistInput => ({
  name, show_date: null, target_seconds: 300, venue_name: null, rating: null, tag_ids: [], items: [], version,
})
const saveSet = (vars: SaveSetlistVars) => new MutationObserver<unknown, Error, SaveSetlistVars>(queryClient, { mutationKey: saveSetlistKey }).mutate(vars)

const page = (version?: number, content = 'Fake words'): WritingSessionInput => ({
  title: 'Fake pages', content, ink: [], ink_pages: 1, timer_seconds: 0, joke_ids: [], observation_ids: [], technique_id: null, version,
})
const saveSession = (vars: SaveSessionVars) => new MutationObserver<unknown, Error, SaveSessionVars>(queryClient, { mutationKey: saveSessionKey }).mutate(vars)

afterEach(() => {
  queryClient.getMutationCache().clear()
  queryClient.clear()
  onlineManager.setOnline(true)
  vi.unstubAllGlobals()
})

describe('a set edited on two devices', () => {
  it("is based on the version the editor opened, and moves on with this device's own saves", async () => {
    serve({ s1: 4 })
    await saveSet({ id: 's1', input: set(4, 'First change') })
    await saveSet({ id: 's1', input: set(4, 'Second change') })
    expect(sent.map((s) => s.body.base_version)).toEqual([4, 5])
    expect('version' in sent[0].body).toBe(false)
  })

  it("goes to Couldn't sync on a clash, and Keep mine goes over the other version", async () => {
    serve({ s1: 6 }) // changed twice on the phone since this device opened version 4
    await saveSet({ id: 's1', input: set(4, 'iPad change') }).catch(() => {})
    await vi.waitFor(() => expect(listUnsynced().some((u) => u.status === 409)).toBe(true))
    const clash = listUnsynced().find((u) => u.status === 409)!
    await retryUnsynced(queryClient, clash)
    await vi.waitFor(() => expect(sent).toHaveLength(2))
    expect(sent[1].body.base_version).toBeUndefined()
  })
})

describe('a session edited on two devices', () => {
  it("keeps this device's writing as a copy, beside the other device's version", async () => {
    serve({ b1: 3 }) // the phone saved it after this device opened version 2
    await saveSession({ id: 'b1', input: page(2, 'Written offline here') })
    const copy = movedTo('b1', 2)!
    expect(sent.map((s) => [s.id, s.body.base_version])).toEqual([['b1', 2], [copy, undefined]])
    expect(sent[1].body.title).toBe(copyTitle('Fake pages'))
    const kept = queryClient.getQueryData<WritingSession>(sessionKey(copy))
    expect([kept?.content, kept?.title]).toEqual(['Written offline here', copyTitle('Fake pages')])
  })

  it('sends the rest of that editing to the same copy, based on its own versions', async () => {
    serve({ b1: 3 })
    await saveSession({ id: 'b1', input: page(2, 'First') })
    await saveSession({ id: 'b1', input: page(2, 'Second') })
    const copy = movedTo('b1', 2)!
    expect(sent.slice(1).map((s) => [s.id, s.body.base_version])).toEqual([[copy, undefined], [copy, 1]])
  })

  it('saves as before when nothing else changed it, and a new session has no check', async () => {
    serve({ b1: 2 })
    await saveSession({ id: 'b1', input: page(2) })
    await saveSession({ id: 'b2', input: page(undefined) })
    expect(sent.map((s) => [s.id, s.body.base_version])).toEqual([['b1', 2], ['b2', undefined]])
    expect(movedTo('b1', 2)).toBeUndefined()
  })

  it('keeps a copy short enough for the server', () => {
    expect(copyTitle('x'.repeat(200)).length).toBeLessThanOrEqual(200)
    expect(copyTitle('  ')).toBe('(copy, edited on two devices)')
  })
})

describe('a session started on this device', () => {
  it('is checked from its second save on, so a later edit elsewhere is not overwritten', async () => {
    serve({})
    await saveSession({ id: 'b3', input: page(0, 'Started here') })
    await saveSession({ id: 'b3', input: page(0, 'Still the same editor') })
    expect(sent.map((s) => s.body.base_version)).toEqual([undefined, 1])
  })
})
