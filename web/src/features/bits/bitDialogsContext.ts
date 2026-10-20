import { createContext, useContext } from 'react'
import type { Bit } from '../../api/types'
import type { Prefill } from './useBitDraft'

export interface BitDialogs {
  openEditor: (bit?: Bit, prefill?: Prefill) => void
  openDetail: (bit: Bit) => void
  deleteBit: (bit: Bit) => Promise<void>
  openInStudio: (bit: Bit) => void
}

export const BitDialogsContext = createContext<BitDialogs | null>(null)

/** Open the bit editor or detail view from any screen. */
export function useBitDialogs(): BitDialogs {
  const value = useContext(BitDialogsContext)
  if (!value) throw new Error('useBitDialogs must be used inside BitDialogsProvider')
  return value
}
