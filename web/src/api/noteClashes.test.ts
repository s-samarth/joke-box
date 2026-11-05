/**
 * Craft notes, observations and premises edited on two devices: each save is based on the
 * version the edit started from, this device's own saves never clash, and a clash waits in
 * Couldn't sync where Keep mine goes over the other version. Made-up material.
 */
import { MutationObserver, onlineManager } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import './craft'
import './observationSaves'
import './premises'
import { queryClient } from './queryClient'
import { listUnsynced, retryUnsynced } from './unsynced'

let sent: Record<string, unknown>[] = []

/** The server: holds one version; a save based on another is refused with 409. */
function serve(version: number) {
  sent = []
  vi.stubGlobal('fetch', async (_: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    sent.push(body)
    if (body.base_version !== undefined && body.base_version !== version) {
      return Response.json({ detail: 'Changed on another device.' }, { status: 409 })
    }
    return Response.json({ ...body, id: 'x1', version: ++version, created_at: '', updated_at: '' })
  })
}

const KINDS = [
  { key: ['craft', 'save'], input: { title: 'Fake note', body: 'Fake words', kind_id: 'k', area_id: 'a', hashtags: [], source: '', url: '', position: 0, performance_log_id: null, analysis_id: null } },
  { key: ['observation', 'save'], input: { text: 'Fake thing noticed', topic_id: null } },
  { key: ['premise', 'save'], input: { topic_id: 't1', take: 'A fake take', notes: '' } },
]

const save = (key: string[], vars: object) => new MutationObserver<unknown, Error, object>(queryClient, { mutationKey: key }).mutate(vars)

afterEach(() => {
  queryClient.getMutationCache().clear()
  queryClient.clear()
  onlineManager.setOnline(true)
  vi.unstubAllGlobals()
})

describe.each(KINDS)('$key.0 edited on two devices', ({ key, input }) => {
  it("is based on the version opened, and moves on with this device's own saves", async () => {
    serve(3)
    await save(key, { id: 'x1', input: { ...input, version: 3 } })
    await save(key, { id: 'x1', input: { ...input, version: 3 } })
    expect(sent.map((s) => s.base_version)).toEqual([3, 4])
    expect('version' in sent[0]).toBe(false)
  })

  it("waits in Couldn't sync on a clash, and Keep mine goes over the other version", async () => {
    serve(5) // changed on the phone since this device opened version 3
    await save(key, { id: 'x1', input: { ...input, version: 3 } }).catch(() => {})
    await vi.waitFor(() => expect(listUnsynced().some((u) => u.status === 409 && u.key[0] === key[0])).toBe(true))
    const clash = listUnsynced().find((u) => u.status === 409 && u.key[0] === key[0])!
    await retryUnsynced(queryClient, clash)
    await vi.waitFor(() => expect(sent).toHaveLength(2))
    expect(sent[1].base_version).toBeUndefined()
  })

  it('a new one is saved without a check', async () => {
    serve(0)
    await save(key, { id: 'x1', input })
    expect(sent[0].base_version).toBeUndefined()
  })
})
