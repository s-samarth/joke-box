/**
 * Where you've moved jokes on the joke board. Moving a box is a queued save like any other: it
 * shows at once, waits on the phone when offline and syncs later. main.tsx imports this file up
 * front, so the saves exist before waiting ones replay.
 */
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './client'
import { keys, queryClient, refreshWhenSynced } from './queryClient'
import { QUEUED } from './sync'

export interface BoardSpot {
  joke_id: string
  /** The topic island it was placed in; relative to that island's top left. */
  topic_id: string
  x: number
  y: number
}

export type PlaceVars = { jokeId: string; input: Omit<BoardSpot, 'joke_id'> }

const placeKey = ['board', 'save']
const tidyKey = ['board', 'tidy']

queryClient.setMutationDefaults(placeKey, {
  ...QUEUED,
  mutationFn: ({ jokeId, input }: PlaceVars) => api<BoardSpot>(`/api/board/${jokeId}`, 'PUT', input),
  onMutate: async ({ jokeId, input }: PlaceVars) => {
    await queryClient.cancelQueries({ queryKey: keys.board })
    queryClient.setQueryData<BoardSpot[]>(keys.board, (old = []) => [...old.filter((s) => s.joke_id !== jokeId), { joke_id: jokeId, ...input }])
  },
  onSettled: () => refreshWhenSynced(keys.board),
})

queryClient.setMutationDefaults(tidyKey, {
  ...QUEUED,
  mutationFn: (jokeIds: string[]) => api<void>('/api/board/tidy', 'POST', { joke_ids: jokeIds }),
  onMutate: async (jokeIds: string[]) => {
    await queryClient.cancelQueries({ queryKey: keys.board })
    const gone = new Set(jokeIds)
    queryClient.setQueryData<BoardSpot[]>(keys.board, (old = []) => (jokeIds.length ? old.filter((s) => !gone.has(s.joke_id)) : []))
  },
  onSettled: () => refreshWhenSynced(keys.board),
})

export const useBoardSpots = () => useQuery({ queryKey: keys.board, queryFn: () => api<BoardSpot[]>('/api/board') })
export const usePlaceJoke = () => useMutation<BoardSpot, Error, PlaceVars>({ mutationKey: placeKey })
/** Put jokes back in the board's own layout; an empty list means every joke. */
export const useTidyBoard = () => useMutation<void, Error, string[]>({ mutationKey: tidyKey })
