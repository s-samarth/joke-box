/** Whether your changes are safely on the server: saved, saving, or waiting offline. */
import { useIsMutating } from '@tanstack/react-query'
import { Cloud, CloudOff, CloudUpload } from 'lucide-react'
import { useOutbox } from '../features/voice/outbox'
import { useOnline } from './useOnline'

export function SyncLight({ withLabel = false }: { withLabel?: boolean }) {
  const online = useOnline()
  // Queued saves plus recordings still to upload (those that failed for good aren't waiting).
  const pending = useIsMutating() + useOutbox().items.filter((n) => !n.failed).length
  const [Icon, label, tone] = !online
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
