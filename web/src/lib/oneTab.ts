/**
 * JokeBox runs in one tab at a time. Two tabs would each keep their own queue of waiting saves
 * and take turns overwriting the one saved copy, so a save made offline in one could vanish.
 *
 * The open tab holds a Web Lock. A new tab that finds it held asks that tab (over a
 * BroadcastChannel) to save everything and step aside, waits for the answer, then takes over.
 * The old tab reloads into a small "open in another tab" screen with a "Use it here" button.
 * Where the browser lacks either API, tabs simply work as before.
 */
const LOCK = 'jokebox-active'
const ASIDE = 'jokebox.tab.aside'
const supported = typeof navigator !== 'undefined' && 'locks' in navigator && typeof BroadcastChannel !== 'undefined'
const channel = supported ? new BroadcastChannel('jokebox-tabs') : null

type Message = { type: 'claim'; id: string } | { type: 'released'; to: string }

/** This tab stepped aside for another one. */
export function isAside(): boolean {
  try { return sessionStorage.getItem(ASIDE) === '1' } catch { return false }
}

/** Take over again: the other tab is asked to step aside as this one loads. */
export function takeOver() {
  try { sessionStorage.removeItem(ASIDE) } catch { /* reload still takes over */ }
  location.reload()
}

/** At launch: if another tab is open, have it save and step aside first. Then hold the lock. */
export async function claim(): Promise<void> {
  if (!channel) return
  const { held = [] } = await navigator.locks.query()
  if (held.some((l) => l.name === LOCK)) {
    const id = crypto.randomUUID()
    await new Promise<void>((resolve) => {
      const done = () => { channel.removeEventListener('message', onMessage); resolve() }
      const onMessage = (e: MessageEvent<Message>) => { if (e.data.type === 'released' && e.data.to === id) done() }
      channel.addEventListener('message', onMessage)
      channel.postMessage({ type: 'claim', id } satisfies Message)
      setTimeout(done, 2_000) // the other tab is frozen or gone: go ahead
    })
  }
  void navigator.locks.request(LOCK, { steal: true }, () => new Promise<void>(() => {}))
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
