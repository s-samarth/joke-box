/**
 * The side panel of a SplitView: a slot beside the open item on wide screens, opened by the item's
 * page (Observations beside a premise or a joke). It stays open as you move between items, until
 * you close it. Outside a SplitView there is no slot, and the page shows a sheet instead.
 */
import { createContext, useContext } from 'react'

export interface SplitSide {
  /** Where the panel goes on a wide screen; null until it's on screen. */
  slot: HTMLElement | null
  open: boolean
  setOpen: (open: boolean) => void
}

export const SplitSideContext = createContext<SplitSide | null>(null)

export const useSplitSide = () => useContext(SplitSideContext)
