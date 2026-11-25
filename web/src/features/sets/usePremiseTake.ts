/**
 * Premise takes for the set builder's toasts and sheets. Sets never change which premise a joke
 * rests on in your library (docs/sets.md): putting a joke under a premise in a set, or taking it
 * out, changes only the set.
 */
import { usePremises } from '../../api/premises'

export const short = (take: string, most = 60) => (take.length > most ? `${take.slice(0, most - 1).trimEnd()}…` : take)
export const many = (n: number) => (n === 1 ? '1 joke' : `${n} jokes`)

export function usePremiseTake() {
  const { data: premises = [] } = usePremises()
  return (id: string | null | undefined) => premises.find((p) => p.id === id)?.take
}
