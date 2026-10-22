/**
 * Saving the order you drag topics, subtopics and observation topics into.
 *
 * The list moves on screen straight away (an optimistic update) and the new order is sent to the
 * server. If that fails (offline, say) the list jumps back and you're told why. Like renaming,
 * this needs a connection, so it isn't queued.
 */
import { useMutation, type QueryKey } from '@tanstack/react-query'
import { api } from './client'
import { keys, queryClient } from './queryClient'
import type { Named, Topic } from './types'

/** `items` in the order of `ids`; anything the ids leave out keeps its place at the end. */
export function inOrder<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const at = new Map(ids.map((id, i) => [id, i]))
  return [...items].sort((a, b) => (at.get(a.id) ?? Infinity) - (at.get(b.id) ?? Infinity))
}

const REORDER = ['reorder']

/** A mutation that reorders one cached list (`apply`) and saves the ids to `url`. */
function useReorder<T>(queryKey: QueryKey, url: (vars: T) => string, apply: (old: unknown, vars: T) => unknown, ids: (vars: T) => string[]) {
  return useMutation({
    mutationKey: REORDER,
    mutationFn: (vars: T) => api<void>(url(vars), 'PUT', { ids: ids(vars) }),
    onMutate: async (vars: T) => {
      // A refetch already on its way would land with the old order on top of the new one.
      await queryClient.cancelQueries({ queryKey })
      const before = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old: unknown) => (old ? apply(old, vars) : old))
      return { before }
    },
    onError: (_e, _vars, context) => queryClient.setQueryData(queryKey, context?.before),
    // Refetch once the last of a quick run of drags is saved, so the list doesn't flick back
    // through the in-between orders.
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: REORDER }) <= 1) void queryClient.invalidateQueries({ queryKey })
    },
  })
}

/** Joke topics. Thoughts stays first, so it isn't among the ids. */
export const useReorderTopics = () =>
  useReorder<string[]>(keys.topics, () => '/api/topics/order', (old, ids) => {
    const topics = old as Topic[]
    return [...topics.filter((t) => t.is_system), ...inOrder(topics.filter((t) => !t.is_system), ids)]
  }, (ids) => ids)

export const useReorderSubtopics = () =>
  useReorder<{ topicId: string; ids: string[] }>(keys.topics, ({ topicId }) => `/api/topics/${topicId}/subtopics/order`,
    (old, { topicId, ids }) => (old as Topic[]).map((t) => (t.id === topicId ? { ...t, subtopics: inOrder(t.subtopics, ids) } : t)),
    ({ ids }) => ids)

export const useReorderObservationTopics = () =>
  useReorder<string[]>(keys.observationTopics, () => '/api/observation-topics/order', (old, ids) => inOrder(old as Named[], ids), (ids) => ids)
