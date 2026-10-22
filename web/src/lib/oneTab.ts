/**
 * JokeBox runs in one tab at a time. Two tabs would each keep their own queue of waiting saves
 * and take turns overwriting the one saved copy, so a save made offline in one could vanish.
 *
 * The open tab holds a Web Lock. A new tab that finds it held asks that tab (over a
 * BroadcastChannel) to save everything and step aside, waits for the answer, then takes over.
 * The old tab reloads into a small "open in another tab" screen with a "Use it here" button.
 * Where the browser lacks either API, tabs simply work as before.
 *
 * You can allow several tabs on this browser (the account menu). Then each tab holds the lock
 * shared, only so a new tab can tell it isn't alone, and nobody steps aside.
 */
const LOCK = 'jokebox-active'
const ASIDE = 'jokebox.tab.aside'
const MANY = 'jokebox.tabs.many'
const supported = typeof navigator !== 'undefined' && 'locks' in navigator && typeof BroadcastChannel !== 'undefined'
const channel = supported ? new BroadcastChannel('jokebox-tabs') : null
const forever = () => new Promise<void>(() => {})

type Message = { type: 'claim'; id: string } | { type: 'released'; to: string }

/** This tab stepped aside for another one. */
export function isAside(): boolean {
  try { return sessionStorage.getItem(ASIDE) === '1' } catch { return false }
}

/** Several tabs are allowed on this browser. */
export function manyTabs(): boolean {
  try { return localStorage.getItem(MANY) === '1' } catch { return false }
}

/** Allow several tabs, or go back to one: the other tabs then save and step aside. */
export function setManyTabs(on: boolean) {
  try { if (on) localStorage.setItem(MANY, '1'); else localStorage.removeItem(MANY) } catch { /* stays as it was */ }
  if (!on) void claim()
}

/** Take over again: the other tab is asked to step aside as this one loads. */
export function takeOver() {
  try { sessionStorage.removeItem(ASIDE) } catch { /* reload still takes over */ }
  location.reload()
}

/** From the "open in another tab" screen: allow several tabs and open this one too. */
export function keepBoth() {
  setManyTabs(true)
  takeOver()
}

/**
 * At launch: if another tab is open, have it save and step aside first, then hold the lock.
 * With several tabs allowed, just hold it shared. Resolves to whether this tab is the only one.
 */
export async function claim(): Promise<boolean> {
  if (!channel) return true
  const { held = [], pending = [] } = await navigator.locks.query()
  const others = [...held, ...pending].some((l) => l.name === LOCK)
  if (manyTabs()) {
    void navigator.locks.request(LOCK, { mode: 'shared' }, forever).catch(() => {})
    return !others
  }
  if (others) {
    const id = crypto.randomUUID()
    await new Promise<void>((resolve) => {
      const done = () => { channel.removeEventListener('message', onMessage); resolve() }
      const onMessage = (e: MessageEvent<Message>) => { if (e.data.type === 'released' && e.data.to === id) done() }
      channel.addEventListener('message', onMessage)
      channel.postMessage({ type: 'claim', id } satisfies Message)
      setTimeout(done, 2_000) // the other tab is frozen or gone: go ahead
    })
  }
  // Stealing also ends this tab's own shared hold when going back to one tab; that's fine.
  void navigator.locks.request(LOCK, { steal: true }, forever).catch(() => {})
  return true
}

/** In the open tab: when a new tab claims, save everything, answer it, and step aside. */
export function stepAsideWhenClaimed(save: () => Promise<void>) {
  channel?.addEventListener('message', (e: MessageEvent<Message>) => {
    if (e.data.type !== 'claim') return
    const { id } = e.data
    void save().catch(() => {}).then(() => {
      channel.postMessage({ type: 'released', to: id } satisfies Message)
      try { sessionStorage.setItem(ASIDE, '1') } catch { /* it'll just take over again on reload */ }
      location.reload()
    })
  })
}

/** Run `task` in one tab at a time (as `name`), or straight away where the browser can't tell. */
export function oneTabAtATime(name: string, task: () => Promise<void>): Promise<void> {
  return supported ? navigator.locks.request(name, task) : task()
}
