/** Whether your changes are safely on the server: saved, saving, or waiting offline. */
import { useQueryClient } from '@tanstack/react-query'
import { Cloud, CloudOff, CloudUpload, LogIn } from 'lucide-react'
import { useEffect } from 'react'
import { keys } from '../api/queryClient'
import { useOnline } from './useOnline'
import { useWaiting } from './useWaiting'

export function SyncLight({ withLabel = false }: { withLabel?: boolean }) {
  const online = useOnline()
  const { count: pending, needsSignIn } = useWaiting()
  const qc = useQueryClient()
  // A save was refused as signed out: check the profile, which sends you to sign in again.
  useEffect(() => { if (needsSignIn) void qc.invalidateQueries({ queryKey: keys.me }) }, [needsSignIn, qc])
  const [Icon, label, tone] = needsSignIn
    ? [LogIn, `Sign in to sync ${pending} waiting`, 'text-amber']
    : !online
    ? [CloudOff, pending ? `Offline, ${pending} waiting to sync` : 'Offline', 'text-amber']
    : pending
      ? [CloudUpload, 'Saving…', 'text-tape']
      : [Cloud, 'All changes saved', 'text-faint']
  return (
    <span className={`inline-flex items-center gap-2 text-sm ${tone}`} role="status" title={label}>
      <Icon size={18} aria-hidden />
      <span className={withLabel ? '' : 'sr-only'}>{label}</span>
    </span>
  )
}
