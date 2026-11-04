/**
 * Edits on two devices. A save is based on the version its edit was made from, so a list
 * refreshed on this device (to another device's edit) can't let it go over that edit unchecked.
 * Everything here is made up.
 */
import { MutationObserver, onlineManager } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveJokeKey, type SaveJokeVars } from './jokeSaves'
import { keys, queryClient } from './queryClient'
import type { Joke, JokeInput } from './types'
import { retryUnsynced } from './unsynced'

const joke = (version: number, setup = 'A made-up setup'): Joke => ({
  id: 'j1', setup, punchline: '', topic_id: 't1', subtopic_id: null, premise_id: null, types: [], status: null, strength: 3,
  duration_seconds: 0, hashtags: [], tag_lines: [], clean_rating: null, language: null, comments: '', follows_id: null,
  version, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
})
/** What the editor holds: the joke as it opened, version included (as toInput keeps it). */
const opened = (version: number): JokeInput => {
  const { id: _id, created_at: _c, updated_at: _u, ...input } = joke(version)
  return input
}

let sent: Record<string, unknown>[] = []
/** The server: answers each save with the next version up from `from`. */
function serve(from: number) {
  sent = []
  let version = from
  vi.stubGlobal('fetch', async (_: string, init: RequestInit) => {
    sent.push(JSON.parse(init.body as string) as Record<string, unknown>)
    return Response.json(joke(++version))
  })
}
const save = (vars: SaveJokeVars) => new MutationObserver<Joke, Error, SaveJokeVars>(queryClient, { mutationKey: saveJokeKey }).mutate(vars)

afterEach(() => {
  queryClient.getMutationCache().clear()
  queryClient.clear()
  onlineManager.setOnline(true)
  vi.unstubAllGlobals()
})

describe('a joke edited on two devices', () => {
  it("is based on the version the edit was made from, not a refreshed list's", async () => {
    queryClient.setQueryData(keys.jokes, [joke(5)])
    const editing = opened(5)
    queryClient.setQueryData(keys.jokes, [joke(6, 'Changed on another device')]) // a refresh lands
    serve(6)
    await save({ id: 'j1', input: { ...editing, setup: 'Changed here' } })
    expect(sent[0].base_version).toBe(5) // so the server refuses it with 409 instead of overwriting
    expect('version' in sent[0]).toBe(false)
  })

  it("moves on with this device's own saves, so quick autosaves never clash", async () => {
    queryClient.setQueryData(keys.jokes, [joke(5)])
    const editing = opened(5)
    serve(5)
    await save({ id: 'j1', input: { ...editing, setup: 'First change' } })
    await save({ id: 'j1', input: { ...editing, setup: 'Second change' } })
    await save({ id: 'j1', input: { ...editing, setup: 'Third change' } })
    expect(sent.map((s) => s.base_version)).toEqual([5, 6, 7])
  })

  it('a new joke is saved without a check, and edits made before it arrived follow it', async () => {
    serve(0)
    await save({ id: 'j1', input: { ...opened(0), version: undefined } })
    await save({ id: 'j1', input: { ...opened(0), setup: 'Edited while it was saving' } })
    expect(sent.map((s) => s.base_version)).toEqual([undefined, 1])
  })

  it('"Keep mine" on a clash goes over the other version', async () => {
    serve(8)
    await retryUnsynced(queryClient, { id: 'u1', key: ['joke', 'save'], variables: { id: 'j1', input: opened(5) }, reason: 'Changed elsewhere', status: 409, at: '' })
    await vi.waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0].base_version).toBeUndefined()
  })
})
