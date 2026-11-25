/** Lists asked for together go as one request, and each settles as if fetched alone. Made-up data. */
import { onlineManager } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from './client'
import { NetworkError } from './network'

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

type Call = { path: string; init: RequestInit }

/** A fake server: /api/batch answers from `batch`, anything else from `lists`. */
function serve(lists: Record<string, unknown>, batch?: (paths: string[]) => Response | Promise<Response>) {
  const calls: Call[] = []
  vi.stubGlobal('fetch', async (path: string, init: RequestInit) => {
    calls.push({ path, init })
    if (path !== '/api/batch') return json(lists[path])
    const { paths } = JSON.parse(init.body as string) as { paths: string[] }
    return batch ? batch(paths) : json({ results: paths.map((p) => ({ status: 200, body: lists[p] })) })
  })
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
  onlineManager.setOnline(true)
})

describe('batched lists', () => {
  it('sends a list asked for on its own as before', async () => {
    const calls = serve({ '/api/jokes': [{ id: 'j1' }] })
    expect(await api('/api/jokes')).toEqual([{ id: 'j1' }])
    expect(calls.map((c) => c.path)).toEqual(['/api/jokes'])
  })

  it('sends lists asked for together as one request', async () => {
    const calls = serve({ '/api/jokes': [{ id: 'j1' }], '/api/topics': [{ id: 't1' }], '/api/me': { id: 'u1' } })
    const got = await Promise.all([api('/api/jokes'), api('/api/topics'), api('/api/me'), api('/api/me')])
    expect(got).toEqual([[{ id: 'j1' }], [{ id: 't1' }], { id: 'u1' }, { id: 'u1' }])
    expect(calls.map((c) => c.path)).toEqual(['/api/batch'])
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ paths: ['/api/jokes', '/api/topics', '/api/me'] })
    expect(new Headers(calls[0].init.headers).get('X-Requested-With')).toBe('jokebox')
  })

  it('gives each list the error it would have had alone', async () => {
    serve({}, () => json({ results: [{ status: 401, body: { detail: 'Not signed in' } }, { status: 200, body: [] }] }))
    const [me, jokes] = await Promise.allSettled([api('/api/me'), api('/api/jokes')])
    expect(me).toMatchObject({ status: 'rejected', reason: { status: 401, message: 'Not signed in' } })
    expect((me as PromiseRejectedResult).reason).toBeInstanceOf(ApiError)
    expect(jokes).toEqual({ status: 'fulfilled', value: [] })
  })

  it("fetches alone what the batch couldn't carry", async () => {
    const calls = serve({ '/api/jokes': [{ id: 'j1' }] }, () => json({ results: [{ status: 200, body: [] }, { status: null }] }))
    expect(await Promise.all([api('/api/topics'), api('/api/jokes')])).toEqual([[], [{ id: 'j1' }]])
    expect(calls.map((c) => c.path)).toEqual(['/api/batch', '/api/jokes'])
  })

  it('fetches each list alone when the server has no batch (an older server)', async () => {
    const calls = serve({ '/api/jokes': [1], '/api/topics': [2] }, () => json({ detail: 'Not Found' }, 404))
    expect(await Promise.all([api('/api/jokes'), api('/api/topics')])).toEqual([[1], [2]])
    expect(calls.map((c) => c.path).sort()).toEqual(['/api/batch', '/api/jokes', '/api/topics'])
  })

  it('counts a batch that never reached the server as no connection for each list', async () => {
    vi.stubGlobal('fetch', async () => { throw new TypeError('Failed to fetch') })
    const settled = await Promise.allSettled([api('/api/jokes'), api('/api/topics')])
    settled.forEach((s) => expect((s as PromiseRejectedResult).reason).toBeInstanceOf(NetworkError))
  })

  it("holds lists asked for while the account check is on its way until it answers", async () => {
    const order: string[] = []
    let answerMe: (r: Response) => void = () => {}
    vi.stubGlobal('fetch', (path: string, init: RequestInit) => {
      order.push(path)
      if (path === '/api/me') return new Promise<Response>((resolve) => { answerMe = resolve })
      const { paths } = JSON.parse(init.body as string) as { paths: string[] }
      return Promise.resolve(json({ results: paths.map(() => ({ status: 200, body: [] })) }))
    })
    const me = api('/api/me')
    await new Promise((r) => setTimeout(r, 20))
    const lists = Promise.all([api('/api/jokes'), api('/api/topics')])
    await new Promise((r) => setTimeout(r, 40))
    expect(order).toEqual(['/api/me'])
    answerMe(json({ id: 'u1' }))
    expect(await me).toEqual({ id: 'u1' })
    expect(await lists).toEqual([[], []])
    expect(order).toEqual(['/api/me', '/api/batch'])
  })

  it('never batches one item, a save, or anything with an id or a query', async () => {
    const calls = serve({ '/api/sessions/0f3a-11': {}, '/api/jokes?x=1': [], '/api/topics': {} })
    await Promise.all([
      api('/api/sessions/0f3a-11'),
      api('/api/jokes?x=1'),
      api('/api/topics', 'POST', { name: 'Fake' }),
    ])
    expect(calls.map((c) => c.path)).not.toContain('/api/batch')
  })
})
