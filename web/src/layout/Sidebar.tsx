/** Desktop sidebar (and the phone drawer's content): brand, sections, topics, account. */
import { BarChart3, ListMusic, LogOut, RefreshCcw, Sparkles } from 'lucide-react'
import { NavLink } from 'react-router'
import { useMe, useReseed } from '../api/library'
import { signOut } from '../api/session'
import { useFeedback } from '../components/ui/feedbackContext'
import { SyncLight } from './SyncLight'
import { TopicTree } from './TopicTree'

const SECTIONS = [
  { to: '/setlist', label: 'Setlist Builder', icon: ListMusic },
  { to: '/performance', label: 'Performance', icon: BarChart3 },
  { to: '/studio', label: 'Creative Studio', icon: Sparkles },
]

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/favicon.svg" alt="" className="size-8 rounded-lg" />
      <span className="font-display text-lg font-bold tracking-tight">JokeBox</span>
    </div>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { data: me } = useMe()
  const reseed = useReseed()
  const { confirm, toast } = useFeedback()

  const doReseed = async () => {
    const ok = await confirm({ title: 'Reset to demo data?', message: 'Deletes everything in this local vault and loads the demo set.', confirmLabel: 'Reseed', danger: true })
    if (ok) reseed.mutate(undefined, { onSuccess: () => toast('Demo data loaded') })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-5 pb-4">
        <Brand />
        <SyncLight compact />
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        <TopicTree onNavigate={onNavigate} />
        <div className="space-y-0.5 border-t border-line pt-4">
          {SECTIONS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => `flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm transition-colors ${isActive ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-white/5 hover:text-text'}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="space-y-3 border-t border-line p-4">
        {me?.env === 'local' && (
          <button type="button" onClick={doReseed} className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-xs text-faint ring-1 ring-dashed ring-line hover:text-text">
            <RefreshCcw size={14} /> Reseed demo data (dev only)
          </button>
        )}
        <div className="flex items-center gap-3">
          {me?.avatar_url ? (
            <img src={me.avatar_url} alt="" referrerPolicy="no-referrer" className="size-9 rounded-full" />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-full bg-raised font-semibold text-accent">{me?.display_name?.[0] ?? '?'}</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{me?.display_name}</p>
            <p className="text-xs text-faint"><span className="text-accent">{me?.plan}</span> · <SyncLight /></p>
          </div>
          <button type="button" onClick={signOut} aria-label="Sign out" title="Sign out" className="inline-flex size-9 items-center justify-center rounded-xl text-faint hover:bg-white/5 hover:text-text">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
