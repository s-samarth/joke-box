/**
 * A brainstorm session autosaves its whole self at every pause. Offline, only the newest copy of
 * each session should wait to sync, not one per pause.
 */
import { MutationObserver, onlineManager } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryClient, saveSessionKey, type SaveSessionVars } from './queryClient'

const input = (content: string) => ({
  title: '', content, ink: [], ink_pages: 1, timer_seconds: 0, joke_ids: [], observation_ids: [], technique_id: null,
})

const save = async (id: string, content: string) => {
  void new MutationObserver<unknown, Error, SaveSessionVars>(queryClient, { mutationKey: saveSessionKey })
    .mutate({ id, input: input(content) })
    .catch(() => {})
  await new Promise((resolve) => setTimeout(resolve, 0)) // let onMutate run
}

const waiting = () =>
  queryClient.getMutationCache().findAll({ mutationKey: saveSessionKey, predicate: (m) => m.state.status === 'pending' })
    .map((m) => (m.state.variables as SaveSessionVars).input.content)

afterEach(() => {
  queryClient.getMutationCache().clear()
  queryClient.clear()
  onlineManager.setOnline(true)
  vi.unstubAllGlobals()
})

describe('session autosaves waiting offline', () => {
  it('keeps only the newest copy of a session', async () => {
    onlineManager.setOnline(false)
    await save('s1', 'a made-up line')
    await save('s1', 'a made-up line, longer')
    await save('s1', 'a made-up line, longer still')
    expect(waiting()).toEqual(['a made-up line, longer still'])
  })

  it("leaves another session's save alone", async () => {
    onlineManager.setOnline(false)
    await save('s1', 'first session')
    await save('s2', 'second session')
    await save('s1', 'first session, edited')
    expect(waiting()).toEqual(['second session', 'first session, edited'])
  })

  it('sends just the newest copy once back online', async () => {
    const sent: string[] = []
    vi.stubGlobal('fetch', async (_path: string, init: RequestInit) => {
      sent.push((JSON.parse(init.body as string) as { content: string }).content)
      return new Response('{}', { headers: { 'content-type': 'application/json' } })
    })
    queryClient.mount() // as the app's provider does: resume waiting saves when back online
    onlineManager.setOnline(false)
    await save('s1', 'one')
    await save('s1', 'two')
    await save('s1', 'three')
    onlineManager.setOnline(true)
    await vi.waitFor(() => expect(waiting()).toEqual([]))
    expect(sent).toEqual(['three'])
    queryClient.unmount()
  })

  it('lets a save already on its way finish', async () => {
    vi.stubGlobal('fetch', () => new Promise(() => {})) // the request never answers
    await save('s1', 'sent')
    onlineManager.setOnline(false)
    await save('s1', 'waiting')
    await save('s1', 'waiting, newer')
    expect(waiting()).toEqual(['sent', 'waiting, newer'])
  })
})
