/** Hooks for the library: profile, topics, types, statuses and bits. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { deleteBitKey, saveBitKey, type SaveBitVars } from './bitSaves'
import { keys } from './queryClient'
import type { Bit, BitTypeInfo, Me, Named, Subtopic, Topic } from './types'

export const useMe = () =>
  useQuery({ queryKey: keys.me, queryFn: () => api<Me>('/api/me'), staleTime: 5 * 60_000 })

export const useTopics = () =>
  useQuery({ queryKey: keys.topics, queryFn: () => api<Topic[]>('/api/topics') })

export const useTypes = () =>
  useQuery({ queryKey: keys.types, queryFn: () => api<BitTypeInfo[]>('/api/types') })

export const useStatuses = () =>
  useQuery({ queryKey: keys.statuses, queryFn: () => api<Named[]>('/api/statuses') })

export const useBits = () => useQuery({ queryKey: keys.bits, queryFn: () => api<Bit[]>('/api/bits') })

export const useSaveBit = () => useMutation<Bit, Error, SaveBitVars>({ mutationKey: saveBitKey })

export const useDeleteBit = () => useMutation<void, Error, string>({ mutationKey: deleteBitKey })

/** Invalidate everything a topic/type change can touch. */
function useRefreshLibrary() {
  const qc = useQueryClient()
  return () => {
    for (const key of [keys.topics, keys.types, keys.bits, keys.logs]) {
      void qc.invalidateQueries({ queryKey: key })
    }
  }
}

export function useTopicActions() {
  const onSuccess = useRefreshLibrary()
  const create = useMutation({
    mutationFn: (name: string) => api<Topic>('/api/topics', 'POST', { name }),
    onSuccess,
  })
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api<Topic>(`/api/topics/${id}`, 'PATCH', { name }),
    onSuccess,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api<void>(`/api/topics/${id}`, 'DELETE'),
    onSuccess,
  })
  const addSubtopic = useMutation({
    mutationFn: ({ topicId, name }: { topicId: string; name: string }) =>
      api<Subtopic>(`/api/topics/${topicId}/subtopics`, 'POST', { name }),
    onSuccess,
  })
  const renameSubtopic = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api<Subtopic>(`/api/subtopics/${id}`, 'PATCH', { name }),
    onSuccess,
  })
  const removeSubtopic = useMutation({
    mutationFn: (id: string) => api<void>(`/api/subtopics/${id}`, 'DELETE'),
    onSuccess,
  })
  return { create, rename, remove, addSubtopic, renameSubtopic, removeSubtopic }
}

export function useTypeActions() {
  const onSuccess = useRefreshLibrary()
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api<void>(`/api/types/${id}`, 'PATCH', { name }),
    onSuccess,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api<void>(`/api/types/${id}`, 'DELETE'),
    onSuccess,
  })
  return { rename, remove }
}

export function useReseed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('/api/dev/reseed', 'POST'),
    onSuccess: () => qc.invalidateQueries(),
  })
}
