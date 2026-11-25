/**
 * Your label fields for set beats (Status, Dominant persona side, Tone, Voice fit, or your own) and the
 * status check's top-up limit. Saved whole, queued like a set, so editing them offline works.
 * Until the server answers (or you change them), the defaults below are used: they match
 * app/services/set_fields.py DEFAULT_FIELDS, so change both together.
 */
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './client'
import { keys, queryClient, refreshWhenSynced } from './queryClient'
import { QUEUED } from './sync'
import type { SetField, SetFields } from './types'

const opts = (...list: [string, string, ('win' | 'neutral' | 'loss')?][]) => list.map(([id, label, group]) => ({ id, label, group: group ?? null }))

export const DEFAULT_FIELDS: SetField[] = [
  { id: 'status', name: 'Status', role: 'status', options: opts(['i-win', 'I win', 'win'], ['mixed', 'Mixed', 'loss'], ['neutral', 'System attack / Neutral', 'neutral'], ['we-lose', 'We lose', 'loss'], ['i-lose', 'I lose', 'loss']) },
  { id: 'persona', name: 'Dominant persona side', role: 'persona', options: opts(['riled-up', 'Riled up'], ['bakchod', 'Bakchod'], ['point-prover', 'Point prover']) },
  { id: 'tone', name: 'Tone', role: null, options: opts(['opinionated', 'Opinionated'], ['playful', 'Playful'], ['edgy', 'Edgy'], ['heartfelt', 'Heartfelt']) },
  { id: 'voice', name: 'Voice fit', role: null, options: opts(['mine', 'Mine'], ['half', 'Half'], ['anyones', "Anyone's"]) },
]
export const DEFAULT_SET_FIELDS: SetFields = { fields: DEFAULT_FIELDS, top_up_seconds: 240 }

const saveKey = ['set-fields', 'save']

queryClient.setMutationDefaults(saveKey, {
  ...QUEUED,
  mutationFn: (input: SetFields) => api<SetFields>('/api/set-fields', 'PUT', input),
  onMutate: async (input: SetFields) => {
    await queryClient.cancelQueries({ queryKey: keys.setFields })
    queryClient.setQueryData<SetFields>(keys.setFields, input)
  },
  onSettled: () => refreshWhenSynced(keys.setFields),
})

export const useSetFields = () => {
  const query = useQuery({ queryKey: keys.setFields, queryFn: () => api<SetFields>('/api/set-fields') })
  return query.data ?? DEFAULT_SET_FIELDS
}
/** The fields as saved, or undefined before they've loaded: a save built on the defaults then
 * would put the defaults over your own fields. */
export const useLoadedSetFields = () => useQuery({ queryKey: keys.setFields, queryFn: () => api<SetFields>('/api/set-fields') }).data
export const useSaveSetFields = () => useMutation<SetFields, Error, SetFields>({ mutationKey: saveKey })
