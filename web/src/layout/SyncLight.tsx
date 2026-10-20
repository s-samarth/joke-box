/** Green "Vault synced", amber "Syncing…", red "Offline". */
import { useIsMutating } from '@tanstack/react-query'
import { useOnline } from './useOnline'

export function SyncLight({ compact = false }: { compact?: boolean }) {
  const online = useOnline()
  const pending = useIsMutating()
  const [color, label] = !online
    ? ['bg-danger', pending ? `Offline · ${pending} waiting` : 'Offline']
    : pending
      ? ['bg-warn animate-pulse', 'Syncing…']
      : ['bg-ok', 'Vault synced']
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted" role="status" title={label}>
      <span className={`size-2 rounded-full ${color}`} />
      {!compact && label}
    </span>
  )
}
