/**
 * How to connect Claude to JokeBox, and the apps connected now with a Disconnect for each.
 * Opened from the account menu.
 */
import { Copy } from 'lucide-react'
import { useConnections, useDisconnect, type Connection } from '../api/connections'
import { Button } from '../components/ui/Button'
import { useFeedback } from '../components/ui/feedbackContext'
import { Modal } from '../components/ui/Modal'
import { formatDateTime } from '../lib/time'

const address = () => `${window.location.origin}/mcp`

function ConnectionRow({ connection }: { connection: Connection }) {
  const disconnect = useDisconnect()
  const { confirm, toast } = useFeedback()
  const leave = async () => {
    const message = `${connection.name} stops reading your JokeBox at once. You can connect it again any time.`
    if (!(await confirm({ title: `Disconnect ${connection.name}?`, message, confirmLabel: 'Disconnect', danger: true }))) return
    disconnect.mutate(connection.client_id, {
      onSuccess: () => toast(`${connection.name} disconnected`),
      onError: () => toast('Couldn’t disconnect. Check your connection and try again.'),
    })
  }
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-ink-3 px-3 py-2">
      <span className="min-w-0">
        <span className="block truncate">{connection.name}</span>
        <span className="block text-xs text-faint">Last used {formatDateTime(connection.last_used_at)}</span>
      </span>
      <Button small variant="danger" onClick={() => void leave()} disabled={disconnect.isPending}>Disconnect</Button>
    </li>
  )
}

export function ClaudeConnector({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: connections, isError } = useConnections(open)
  const { toast } = useFeedback()
  const copy = () => navigator.clipboard.writeText(address()).then(() => toast('Copied'), () => toast('Couldn’t copy'))
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Claude connector" description="Let Claude read your JokeBox while you write. It can’t change anything.">
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-dim">
        <li>In Claude, open Settings, then Connectors, and add a custom connector.</li>
        <li>Paste this address and press Connect:</li>
      </ol>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-ink-3 px-3 py-2 text-sm">{address()}</code>
        <Button small icon={<Copy size={16} />} onClick={() => void copy()}>Copy</Button>
      </div>
      <p className="mt-2 text-sm text-dim">Sign in here when Claude asks, then allow it. It works on your phone too.</p>
      <h3 className="mt-5 mb-2 font-medium">Connected now</h3>
      {isError && <p className="text-sm text-dim">Couldn’t load this. Check your connection.</p>}
      {connections?.length === 0 && <p className="text-sm text-dim">Nothing is connected.</p>}
      <ul className="space-y-2">
        {connections?.map((c) => <ConnectionRow key={c.client_id} connection={c} />)}
      </ul>
    </Modal>
  )
}
