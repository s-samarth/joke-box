/**
 * A save that failed for good, then a newer save of the same thing that went through: the old
 * one leaves Couldn't sync, so Retry can't put the older text back over the newer (made-up text).
 */
import { MutationObserver, onlineManager } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveJokeKey, type SaveJokeVars } from './jokeSaves'
import { queryClient, saveSessionKey, type SaveSessionVars } from './queryClient'
import './sessionSaves'
import type { Joke, JokeInput, WritingSessionInput } from './types'
import { listUnsynced } from './unsynced'

function server() {
  let refuse = true
  vi.stubGlobal('fetch', async (path: string, init: RequestInit) => {
    const id = path.split('/').pop() ?? ''
    const fields = JSON.parse(init.body as string) as Record<string, unknown>
    if (refuse) return Response.json({ detail: 'Unknown topic in request' }, { status: 422 })
    const now = '2026-05-05T05:05:05Z'
    return Response.json({ ...fields, id, version: 6, ink_strokes: 0, created_at: now, updated_at: now })
  })
  return { accept: () => { refuse = false } }
}

const jokeInput = (setup: string): JokeInput => ({
  setup, punchline: 'a made-up punch', topic_id: 't1', subtopic_id: null, premise_id: null, types: [], status: null, strength: 3,
  duration_seconds: 0, hashtags: [], tag_lines: [], clean_rating: null, language: null, comments: '', follows_id: null, version: 5,
})
const saveJoke = (vars: SaveJokeVars) => new MutationObserver<Joke, Error, SaveJokeVars>(queryClient, { mutationKey: saveJokeKey }).mutate(vars)
const page = (strokes: number): WritingSessionInput => ({
  title: 'Fake pages', content: '', ink: Array.from({ length: strokes }, () => ({ points: [[1, 1, 0.5]], color: '#fff', size: 2, page: 0 })) as unknown as WritingSessionInput['ink'],
  ink_pages: 1, timer_seconds: 0, joke_ids: [], observation_ids: [], technique_id: null, version: 2,
})
const saveSession = (vars: SaveSessionVars) => new MutationObserver<unknown, Error, SaveSessionVars>(queryClient, { mutationKey: saveSessionKey }).mutate(vars)

afterEach(() => {
  queryClient.getMutationCache().clear()
  queryClient.clear()
  onlineManager.setOnline(true)
  vi.unstubAllGlobals()
})

describe("a newer save of the same thing clears it from Couldn't sync", () => {
  it('for a joke', async () => {
    const s = server()
    await saveJoke({ id: 'j1', input: jokeInput('Old words plus a line') }).catch(() => {})
    await vi.waitFor(() => expect(listUnsynced().length).toBe(1))
    s.accept()
    await saveJoke({ id: 'j1', input: jokeInput('Old words plus a line plus the newest line') })
    await vi.waitFor(() => expect(listUnsynced()).toEqual([]))
  })

  it('for handwriting', async () => {
    const s = server()
    await saveSession({ id: 'b1', input: page(10) }).catch(() => {})
    await vi.waitFor(() => expect(listUnsynced().length).toBe(1))
    s.accept()
    await saveSession({ id: 'b1', input: page(25) })
    await vi.waitFor(() => expect(listUnsynced()).toEqual([]))
  })

  it('but not for a different joke', async () => {
    const s = server()
    await saveJoke({ id: 'j1', input: jokeInput('One joke') }).catch(() => {})
    await vi.waitFor(() => expect(listUnsynced().length).toBe(1))
    s.accept()
    await saveJoke({ id: 'j2', input: jokeInput('Another joke') })
    expect(listUnsynced().length).toBe(1)
  })
})
