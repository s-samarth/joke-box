/** A thin wrapper around fetch for our same-origin JSON API. */

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export async function api<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: {
      // The server refuses changes without this header: our CSRF protection.
      'X-Requested-With': 'jokebox',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    throw new ApiError(response.status, await errorMessage(response))
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

async function errorMessage(response: Response): Promise<string> {
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
