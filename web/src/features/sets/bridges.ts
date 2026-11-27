/**
 * Bridges (docs/sets.md): lines you might say to carry the momentum from a joke or a block into the
 * next one. Each is kept on what it follows (`bridges` on a joke or a block), so it moves with it.
 * Removing the last one leaves an empty list, which is how a save clears them: missing means
 * "keep what's stored", for apps from before bridges.
 */
import { newId } from '../../api/client'
import type { SetBridge } from '../../api/types'

type HasBridges = { bridges?: SetBridge[] | null }

export const bridgesOf = (x: HasBridges): SetBridge[] => x.bridges ?? []

/** The bridges with something in them: what the Bird's eye view and the cue card show. */
export const spoken = (x: HasBridges): SetBridge[] => bridgesOf(x).filter((b) => b.text.trim())

export const addBridge = <T extends HasBridges>(x: T): T => ({ ...x, bridges: [...bridgesOf(x), { id: newId(), text: '' }] })

export const writeBridge = <T extends HasBridges>(x: T, id: string, text: string): T =>
  ({ ...x, bridges: bridgesOf(x).map((b) => (b.id === id ? { ...b, text } : b)) })

export const dropBridge = <T extends HasBridges>(x: T, id: string): T => ({ ...x, bridges: bridgesOf(x).filter((b) => b.id !== id) })
