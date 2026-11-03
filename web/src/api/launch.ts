/**
 * What runs once the saved copy has loaded at launch (the provider's onSuccess in main.tsx).
 *
 * It must return at once. Until it does the app counts as still loading: no screen fetches and
 * nothing new is written back to the phone. Saves waiting from before can take minutes on a weak
 * signal, or wait for good while signed out, and if the phone ended the app meanwhile, everything
 * written since was lost. So they replay in the background.
 */
import { upgradeOldCache } from './legacy'
import { markRestored } from './persist'
import { queryClient, resumeQueued } from './queryClient'
import { checkAccount } from './session'

export function afterRestore(): void {
  markRestored()
  upgradeOldCache(queryClient)
  // Who's signed in comes first: waiting saves only ever go to the account that made them.
  void checkAccount().then(resumeQueued).then(() => queryClient.invalidateQueries())
}
