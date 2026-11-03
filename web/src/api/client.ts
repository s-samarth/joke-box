/** A thin wrapper around fetch for our same-origin JSON API. */
import { handedOver } from '../lib/oneTab'
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

/**
 * A big upload (a session full of handwriting) gets longer, a second more for every 50 KB, up to
 * two minutes: on a slow upload it would otherwise time out every try and never sync.
 */
export const timeoutFor = (bytes: number) => Math.min(120_000, TIMEOUT + Math.ceil(bytes / 50_000) * 1000)

/** The host refuses a body over 4.5 MB. Refused here instead, before uploading it for nothing. */
export const MAX_BODY = 4_400_000
const TOO_BIG = 'Too big to sync. Start a new session for more pages.'

const sizeOf = (data: string | Blob) => (typeof data === 'string' ? new Blob([data]).size : data.size)

export async function api<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  // This tab handed over to another, which sends the waiting saves now (see lib/oneTab.ts).
  if (handedOver()) throw new NetworkError()
  // A big body (a session full of handwriting) goes gzip-packed: see packed.ts.
  const sent = body === undefined ? undefined : await requestBody(body)
  const bytes = sent ? sizeOf(sent.data) : 0
  if (bytes > MAX_BODY) throw new ApiError(413, TOO_BIG)
  const response = await reach(path, {
    method,
    credentials: 'same-origin',
    headers: {
      // The server refuses changes without this header: our CSRF protection.
      'X-Requested-With': 'jokebox',
      ...(sent ? { 'Content-Type': sent.type } : {}),
    },
    body: sent?.data,
    signal: AbortSignal.timeout(timeoutFor(bytes)),
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
  if (response.status === 413) return TOO_BIG
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
