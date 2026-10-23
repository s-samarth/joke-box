/**
 * Getting the app going again after it crashes.
 *
 * The usual cause on a phone is an out-of-date copy of the app: the installed app keeps its own
 * files and saved lists, and after a release it can ask for a file the new release replaced, or
 * meet saved data in an older shape. The fix is a fresh copy: drop the installed files and the
 * saved lists, keep the saves still waiting to sync, and reload.
 */
import { get, set } from 'idb-keyval'
import { CACHE_KEY } from '../api/queryClient'

const REPAIRED_AT = 'jokebox.repairedAt'
/** A second crash this soon after a repair means the repair didn't help: show the error instead. */
const RETRY_GAP = 60_000

/** True for errors from an old copy of the app asking for a file a newer release replaced. */
export function isStaleBuild(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return /dynamically imported module|importing a module script failed|ChunkLoadError|unable to preload css/i.test(text)
}

/** Whether to repair on our own: not if we already did within the last minute. */
export function shouldRepair(lastRepairAt: number | null, now: number): boolean {
  return lastRepairAt === null || now - lastRepairAt > RETRY_GAP
}

/** The saved copy without its lists, which come back from the server; waiting saves stay. */
export function withoutLists(saved: string): string {
  const client = JSON.parse(saved) as { clientState?: { queries?: unknown[] } }
  if (client.clientState) client.clientState.queries = []
  return JSON.stringify(client)
}

const lastRepair = () => {
  try {
    const at = Number(sessionStorage.getItem(REPAIRED_AT))
    return at > 0 ? at : null
  } catch {
    return null
  }
}

/** Repair once on our own when it looks like an old copy; returns whether it's repairing. */
export function repairIfStale(error: unknown): boolean {
  if (!isStaleBuild(error) || !shouldRepair(lastRepair(), Date.now())) return false
  void freshCopy()
  return true
}

/**
 * Reload into a fresh copy of the app. Offline it only reloads: without the installed files
 * there'd be no app to open until the signal comes back.
 */
export async function freshCopy() {
  try {
    sessionStorage.setItem(REPAIRED_AT, String(Date.now()))
  } catch {
    // Private mode can refuse storage; the repair still works, it just may repeat.
  }
  if (navigator.onLine) {
    const steps = [
      async () => Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister())),
      async () => Promise.all((await caches.keys()).map((k) => caches.delete(k))),
      async () => {
        const saved = await get<string>(CACHE_KEY)
        if (saved) await set(CACHE_KEY, withoutLists(saved))
      },
    ]
    // Each step on its own, so one that fails (an older browser, say) doesn't stop the reload.
    for (const step of steps) await step().catch(() => {})
  }
  location.reload()
}
