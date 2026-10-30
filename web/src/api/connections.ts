/**
 * Apps connected to your JokeBox (Claude, through the connector). Unlike saves, disconnecting
 * isn't queued for later: it should happen now or say it couldn't, so it's a plain mutation.
 */
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './client'
import { keys, queryClient } from './queryClient'

export interface Connection {
  client_id: string
  name: string
  last_used_at: string
}

export const useConnections = (enabled: boolean) =>
  useQuery({ queryKey: keys.connections, queryFn: () => api<Connection[]>('/api/connections'), enabled })

export const useDisconnect = () =>
  useMutation({
    mutationFn: (clientId: string) => api<void>(`/api/connections/${encodeURIComponent(clientId)}`, 'DELETE'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.connections }),
  })
