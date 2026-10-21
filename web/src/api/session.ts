/**
 * Signing out, and making sure saves waiting on this phone only ever go to the account that made
 * them. Signing out wipes them (the account menu warns first); a different account signing in
 * on this phone drops the previous one's instead of filing them under the new account.
 */
import { clearOutbox } from '../features/voice/outbox'
import { forgetAllAudio } from '../features/voice/audioCache'
import { api } from './client'
import { keys, persister, queryClient } from './queryClient'
import type { Me } from './types'
import { clearUnsynced } from './unsynced'

/** Everything on this phone that hasn't reached the server: queued saves, recordings, the Couldn't sync list. */
async function forgetWaiting() {
  queryClient.getMutationCache().clear()
  await Promise.all([clearOutbox(), clearUnsynced(), forgetAllAudio()])
}

/* Whose saves are waiting on this phone. Kept apart from the cache, which can drop the profile
 * (it isn't saved once a sign-in has run out). */
const OWNER_KEY = 'jokebox.owner'
const owner = (): string | null => {
  try { return localStorage.getItem(OWNER_KEY) } catch { return null }
}
const setOwner = (id: string | null) => {
  try {
    if (id) localStorage.setItem(OWNER_KEY, id)
    else localStorage.removeItem(OWNER_KEY)
  } catch {
    // storage blocked: the check below just can't help
  }
}

/** Sign out and wipe the offline cache, so nothing stays on a shared device. */
export async function signOut() {
  await api('/auth/logout', 'POST').catch(() => undefined)
  await forgetWaiting().catch(() => undefined)
  setOwner(null)
  queryClient.clear()
  await persister.removeClient()
  window.location.assign('/login')
}

/**
 * Run before waiting saves are sent on launch. If someone else is now signed in on this phone
 * (the last account's sign-in ran out and a different one signed in), the saves aren't theirs.
 * Offline or signed out, it can't tell yet, and the saves simply keep waiting.
 */
export async function checkAccount(): Promise<void> {
  const before = owner() ?? queryClient.getQueryData<Me>(keys.me)?.id
  try {
    const me = await api<Me>('/api/me')
    setOwner(me.id)
    if (before && before !== me.id) {
      await forgetWaiting()
      queryClient.removeQueries() // and don't show them the last account's jokes either
    }
    queryClient.setQueryData(keys.me, me)
  } catch {
    // offline, or signed out: nothing is sent until someone signs in anyway
  }
}
