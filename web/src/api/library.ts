/** Hooks for the library: profile, topics, types, statuses and jokes. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { deleteJokeKey, saveJokeKey, type SaveJokeVars } from './jokeSaves'
import { keys } from './queryClient'
import type { Joke, JokeTypeInfo, Me, Named, Subtopic, Topic } from './types'

export const useMe = () =>
  useQuery({ queryKey: keys.me, queryFn: () => api<Me>('/api/me'), staleTime: 5 * 60_000 })

export const useTopics = () =>
  useQuery({ queryKey: keys.topics, queryFn: () => api<Topic[]>('/api/topics') })

export const useTypes = () =>
  useQuery({ queryKey: keys.types, queryFn: () => api<JokeTypeInfo[]>('/api/types') })

export const useStatuses = () =>
  useQuery({ queryKey: keys.statuses, queryFn: () => api<Named[]>('/api/statuses') })

export const useJokes = () => useQuery({ queryKey: keys.jokes, queryFn: () => api<Joke[]>('/api/jokes') })

export const useSaveJoke = () => useMutation<Joke, Error, SaveJokeVars>({ mutationKey: saveJokeKey })

export const useDeleteJoke = () => useMutation<void, Error, string>({ mutationKey: deleteJokeKey })

/** Invalidate everything a topic/type change can touch. */
function useRefreshLibrary() {
  const qc = useQueryClient()
  return () => {
    for (const key of [keys.topics, keys.types, keys.jokes, keys.logs, keys.premises]) {
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
