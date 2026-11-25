/**
 * Lists asked for together go to the server as one request (POST /api/batch, see
 * app/routers/batch.py).
 *
 * Opening the app, pulling to refresh, or coming back after a few minutes asks for many lists at
 * once. On Vercel, when no server copy is awake, each request started its own copy, and each
 * start costs CPU against the Hobby plan's monthly allowance (one app open started 12). So list
 * GETs made within a few milliseconds of each other are sent as one batch, and one copy answers
 * them all. A GET made on its own goes out on its own, as before.
 *
 * Each list still settles as if fetched alone: its data, or the same ApiError it would have had.
 * Whatever the batch can't carry (an answer that isn't JSON, or past the size the host allows),
 * or a batch the server doesn't answer properly (an older server, an error), is fetched one by one.
 */
import { ApiError, CheckpointError, reach } from './client'
import { NetworkError, lostConnection } from './network'

/** List addresses only: no ids, no query (app/routers/batch.py checks the same). */
const LIST = /^\/api\/[a-z-]+(\/[a-z-]+)?$/
/** How long a GET waits for others to go with it. */
export const GATHER_MS = 10
/** A batch carries several lists, so it gets longer than one request's 20 seconds. */
const TIMEOUT = 40_000
const MAX_PATHS = 30

export const batchable = (path: string): boolean => LIST.test(path) && path !== '/api/batch'

type Waiter = { resolve: (value: unknown) => void; reject: (error: unknown) => void; one: () => Promise<unknown> }
type Answer = { status: number | null; body?: unknown }

let waiting = new Map<string, Waiter[]>()
let timer: ReturnType<typeof setTimeout> | undefined
/**
 * Who's signed in is asked first at launch, a moment before the lists. Lists asked for while it's
 * on its way wait for its answer, so they reach the server copy it woke instead of waking another.
 * On an awake server that's a wait of about a tenth of a second.
 */
let account: Promise<unknown> | undefined
const ACCOUNT = '/api/me'

/** Get one list, in a batch with any others asked for in the next few milliseconds. */
export function batchedGet<T>(path: string, one: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const waiter = { resolve: resolve as (value: unknown) => void, reject, one }
    waiting.set(path, [...(waiting.get(path) ?? []), waiter])
    timer ??= setTimeout(() => void flush(), GATHER_MS)
  })
}

async function flush() {
  const gathered = [...waiting.entries()]
  waiting = new Map()
  timer = undefined
  if (gathered.length === 1 && gathered[0][0] === ACCOUNT) {
    const settled = (account = alone(gathered[0]).then(() => {}, () => {}))
    void settled.then(() => { if (account === settled) account = undefined })
    return
  }
  if (account) await account
  for (let i = 0; i < gathered.length; i += MAX_PATHS) void send(gathered.slice(i, i + MAX_PATHS))
}

/** Each waiter for a path fetches it alone (the first one's fetch is shared). */
function alone([, waiters]: [string, Waiter[]]): Promise<unknown> {
  const fetched = waiters[0].one()
  waiters.forEach((w) => fetched.then(w.resolve, w.reject))
  return fetched
}

async function send(group: [string, Waiter[]][]) {
  if (group.length === 1) return void alone(group[0])
  const fail = (error: unknown) => group.forEach(([, ws]) => ws.forEach((w) => w.reject(error)))
  let answers: Answer[]
  try {
    answers = await post(group.map(([path]) => path))
  } catch (error) {
    if (error instanceof Fallback) return group.forEach((entry) => void alone(entry))
    return fail(error)
  }
  group.forEach((entry, i) => settle(entry, answers[i]))
}

function settle(entry: [string, Waiter[]], answer: Answer | undefined) {
  const [, waiters] = entry
  if (!answer || answer.status === null) return void alone(entry)
  if (answer.status >= 200 && answer.status < 300) return waiters.forEach((w) => w.resolve(answer.body ?? undefined))
  const error = new ApiError(answer.status, detail(answer))
  waiters.forEach((w) => w.reject(error))
}

function detail({ status, body }: Answer): string {
  const said = (body as { detail?: unknown } | null | undefined)?.detail
  if (typeof said === 'string') return said
  if (Array.isArray(said)) return 'Please check the form and try again.'
  return `Request failed (${status})`
}

/** The batch didn't come back in a shape to read: fetch each list alone instead. */
class Fallback extends Error {}

function noConnection(): never {
  lostConnection()
  throw new NetworkError()
}

async function post(paths: string[]): Promise<Answer[]> {
  const response = await reach('/api/batch', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'jokebox', 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths }),
    signal: AbortSignal.timeout(TIMEOUT),
  })
  if (response.status === 511) noConnection() // wifi that wants you to sign in
  if (response.headers.get('x-vercel-mitigated')) throw new CheckpointError()
  if (!response.ok) throw new Fallback()
  // A web page instead of JSON means a wifi sign-in page: no connection yet, as for one list.
  if (!response.headers.get('content-type')?.includes('json')) noConnection()
  let data: { results?: Answer[] }
  try {
    data = (await response.json()) as { results?: Answer[] }
  } catch {
    return noConnection() // cut off mid-way
  }
  if (!Array.isArray(data.results) || data.results.length !== paths.length) throw new Fallback()
  return data.results
}
