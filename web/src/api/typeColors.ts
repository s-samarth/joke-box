/** Reading and choosing type dot colours. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { DEFAULT_TYPE_COLORS, NO_COLOR } from '../lib/typeColors'
import { api } from './client'
import { useTypes } from './library'
import { keys } from './queryClient'
import type { BitTypeInfo } from './types'

type Chosen = Record<string, string>

/**
 * Colours picked for types that don't exist yet: a new type is only saved with its joke, so
 * until then its colour waits here. The types list wins once it has the type.
 */
const useChosen = () =>
  useQuery<Chosen>({ queryKey: keys.typeColors, queryFn: () => ({}), initialData: {}, staleTime: Infinity })

/** `colorOf(name)`: a type's dot colour, case-insensitively, falling back to the defaults. */
export function useTypeColor(): (name: string) => string {
  const { data: types = [] } = useTypes()
  const { data: chosen } = useChosen()
  return useMemo(() => {
    const saved = new Map(types.map((t) => [t.name.toLowerCase(), t.color]))
    return (name: string) => {
      const key = name.toLowerCase()
      return saved.get(key) ?? chosen[key] ?? DEFAULT_TYPE_COLORS[key] ?? NO_COLOR
    }
  }, [types, chosen])
}

/** Set a type's colour, showing it straight away. Works before the type exists. */
export function useSetTypeColor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) => api<void>('/api/types/color', 'PUT', { name, color }),
    onMutate: ({ name, color }) => {
      const key = name.toLowerCase()
      qc.setQueryData<BitTypeInfo[]>(keys.types, (old) => old?.map((t) => (t.name.toLowerCase() === key ? { ...t, color } : t)))
      qc.setQueryData<Chosen>(keys.typeColors, (old = {}) => ({ ...old, [key]: color }))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.types }),
  })
}
