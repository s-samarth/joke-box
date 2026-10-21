/** Your avatar: import, sign out, and (on your laptop only) reset to demo data. */
import { FolderInput, LogOut, RefreshCcw } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useMe, useReseed } from '../api/library'
import { signOut } from '../api/session'
import { useFeedback } from '../components/ui/feedbackContext'
import { Dropdown, type MenuItem } from '../components/ui/Menu'

export function AccountMenu({ showName = false }: { showName?: boolean }) {
  const { data: me } = useMe()
  const reseed = useReseed()
  const { confirm, toast } = useFeedback()
  const navigate = useNavigate()

  const items: MenuItem[] = [
    { label: 'Import', icon: <FolderInput size={16} />, onSelect: () => navigate('/import') },
    { label: 'Sign out', icon: <LogOut size={16} />, onSelect: () => void signOut() },
  ]
  if (me?.env === 'local') {
    items.unshift({
      label: 'Reset to demo data',
      icon: <RefreshCcw size={16} />,
      onSelect: async () => {
        const ok = await confirm({ title: 'Reset to demo data?', message: 'Deletes everything in this local copy and loads the demo set.', confirmLabel: 'Reset', danger: true })
        if (ok) reseed.mutate(undefined, { onSuccess: () => toast('Demo data loaded') })
      },
    })
  }

  return (
    <Dropdown
      align="start"
      items={items}
      trigger={
        <button type="button" className="flex min-w-0 items-center gap-3 rounded-lg p-1.5 text-left hover:bg-ink-3" aria-label="Account">
          {me?.avatar_url ? (
            <img src={me.avatar_url} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full" />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-full bg-ink-4 text-sm font-semibold">{me?.display_name?.[0]?.toUpperCase() ?? '?'}</span>
          )}
          {showName && (
            <span className="min-w-0">
              <span className="block truncate text-sm">{me?.display_name}</span>
              <span className="block truncate text-xs text-faint">{me?.email}</span>
            </span>
          )}
        </button>
      }
    />
  )
}
