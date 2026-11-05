/**
 * Layout changes (the list giving way to a joke, the sidebar folding, Map taking the screen) cross-fade
 * instead of jumping, where the browser can (Safari 18 and Chrome). Reduced motion skips it.
 */
import { flushSync } from 'react-dom'

export const reducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Make a state change inside a view transition, so the screen fades from before to after. */
export function withTransition(change: () => void): void {
  if (typeof document.startViewTransition !== 'function' || reducedMotion()) return change()
  document.startViewTransition(() => flushSync(change))
}
