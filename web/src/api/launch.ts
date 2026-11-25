/**
 * What runs once the saved copy has loaded at launch (the provider's onSuccess in main.tsx).
 *
 * It must return at once. Until it does the app counts as still loading: no screen fetches and
 * nothing new is written back to the phone. Saves waiting from before can take minutes on a weak
 * signal, or wait for good while signed out, and if the phone ended the app meanwhile, everything
 * written since was lost. So they replay in the background.
 */
import { markRestored } from './persist'
import { queryClient, resumeQueued } from './queryClient'
import { checkAccount } from './session'

export function afterRestore(): void {
  const launched = Date.now()
  markRestored()
  showWaitingSaves()
  // Who's signed in comes first: waiting saves only ever go to the account that made them. Then
  // lists from the saved copy refresh, but not ones already fetched since launch (the screen's
  // own stale lists fetch as it opens), and a fetch already on its way isn't restarted: doing
  // either made every Home list load twice.
  void checkAccount().then(resumeQueued).then(() => queryClient.invalidateQueries(
    { predicate: (q) => q.state.dataUpdatedAt < launched && q.state.fetchStatus !== 'fetching' },
    { cancelRefetch: false },
  ))
}

/**
 * Show each waiting save in the lists again, oldest first, as when it was made. A save can be
 * written to the phone before it showed (each shows after a moment's wait), and a restored save
 * isn't shown again when it's sent. An editor opened on the older text would then send that
 * back over the newer one. Each one sets or drops an item, so showing it twice is harmless.
 */
export function showWaitingSaves(): Promise<void> {
  let chain = Promise.resolve()
  for (const m of queryClient.getMutationCache().getAll()) {
    const show = m.options.onMutate
    if (m.state.status !== 'pending' || !show) continue
    const context = { client: queryClient, meta: m.options.meta, mutationKey: m.options.mutationKey }
    chain = chain.then(() => show(m.state.variables, context)).then(() => {}, () => {})
  }
  return chain
}
