/** A thin wrapper around fetch for our same-origin JSON API. */
import { NetworkError, isConnectionFailure, isForeign, lostConnection } from './network'
import { PACKED_JSON, requestBody, unpack } from './packed'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** How long a request may take before we treat it as no signal (a weak basement signal can hang). */
const TIMEOUT = 20_000

export async function api<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  // A big body (a session full of handwriting) goes gzip-packed: see packed.ts.
  const sent = body === undefined ? undefined : await requestBody(body)
  const response = await reach(path, {
    method,
    credentials: 'same-origin',
    headers: {
      // The server refuses changes without this header: our CSRF protection.
      'X-Requested-With': 'jokebox',
      ...(sent ? { 'Content-Type': sent.type } : {}),
    },
    body: sent?.data,
    signal: AbortSignal.timeout(TIMEOUT),
  })
  // 511: wifi that wants you to sign in, said politely.
  if (response.status === 511) noConnection()
  if (!response.ok) {
    throw new ApiError(response.status, await errorMessage(response))
  }
  if (response.status === 204) return undefined as T
  // A whole brainstorm session comes back packed. Checked before the test below, which would
  // otherwise take it for a wifi sign-in page.
  if (response.headers.get('content-type')?.startsWith(PACKED_JSON) && response.body) {
    try {
      return JSON.parse(await unpack(response.body)) as T
    } catch {
      return noConnection() // cut off mid-way
    }
  }
  // Our API always answers in JSON. A web page instead means wifi that wants you to sign in
  // first: that's no connection yet, so the save waits rather than failing for good.
  if (!response.headers.get('content-type')?.includes('json')) noConnection()
  try {
    return (await response.json()) as T
  } catch {
    return noConnection() // the answer was cut off mid-way
  }
}

function noConnection(): never {
  lostConnection()
  throw new NetworkError()
}

/** fetch, but a request that never reaches the server marks us offline and throws a NetworkError. */
export async function reach(path: string, init: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch (e) {
    if (!isConnectionFailure(e)) throw e
    return noConnection()
  }
  if (isForeign(response)) noConnection() // redirected to a wifi sign-in page
  return response
}

async function errorMessage(response: Response): Promise<string> {
  if (response.status === 413) return 'Too big to sync. Start a new session for more pages.'
  try {
    const data = (await response.json()) as { detail?: unknown }
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail)) return 'Please check the form and try again.'
  } catch {
    // not JSON
  }
  return `Request failed (${response.status})`
}

/** Ids are made in the browser so a save made offline can be retried without duplicates. */
export const newId = (): string => crypto.randomUUID()
