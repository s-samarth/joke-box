/** Your avatar: import, the Claude connector, several tabs, sign out, and (on your laptop only) reset to demo data. */
import { AppWindow, FolderInput, LogOut, Plug, RefreshCcw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMe, useReseed } from '../api/library'
import { signOut } from '../api/session'
import { useFeedback } from '../components/ui/feedbackContext'
import { Dropdown, type MenuItem } from '../components/ui/Menu'
import { manyTabs, setManyTabs } from '../lib/oneTab'
import { ClaudeConnector } from './ClaudeConnector'
import { useWaiting } from './useWaiting'

export function AccountMenu({ showName = false }: { showName?: boolean }) {
  const { data: me } = useMe()
  const reseed = useReseed()
  const { confirm, toast } = useFeedback()
  const navigate = useNavigate()
  const { count: waiting } = useWaiting()
  // Signing out wipes this phone, so changes that haven't synced yet would be lost: ask first.
  const leave = async () => {
    const changes = waiting === 1 ? '1 change hasn’t' : `${waiting} changes haven’t`
    const message = `Signing out deletes ${waiting === 1 ? 'it' : 'them'} from this phone. Wait until you’re online and the cloud says all changes are saved.`
    if (waiting && !(await confirm({ title: `${changes} synced yet`, message, confirmLabel: 'Sign out anyway', danger: true }))) return
    void signOut()
  }
  const [many, setMany] = useState(manyTabs)
  const [connector, setConnector] = useState(false)
  const toggleTabs = async () => {
    if (many) {
      setManyTabs(false)
      setMany(false)
      return toast('Back to one tab: JokeBox stepped aside in your other tabs')
    }
    const message = 'For when you won’t edit the same thing in two tabs. Each tab keeps its own unsynced changes, so offline, close a tab only once it has synced (it asks first). Just this browser.'
    if (!(await confirm({ title: 'Allow several tabs?', message, confirmLabel: 'Allow' }))) return
    setManyTabs(true)
    setMany(true)
  }

  const items: MenuItem[] = [
    { label: 'Import', icon: <FolderInput size={16} />, onSelect: () => navigate('/import') },
    { label: 'Claude connector', icon: <Plug size={16} />, onSelect: () => setConnector(true) },
    { label: 'Several tabs', icon: <AppWindow size={16} />, checked: many, onSelect: () => void toggleTabs() },
    { label: 'Sign out', icon: <LogOut size={16} />, onSelect: () => void leave() },
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
    <>
      <ClaudeConnector open={connector} onOpenChange={setConnector} />
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
    </>
  )
}
