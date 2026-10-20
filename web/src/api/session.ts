import { api } from './client'
import { persister, queryClient } from './queryClient'

/** Sign out and wipe the offline cache, so nothing stays on a shared device. */
export async function signOut() {
  await api('/auth/logout', 'POST').catch(() => undefined)
  queryClient.clear()
  await persister.removeClient()
  window.location.assign('/login')
}
