/**
 * The side rail on iPad and desktop, with every screen. Full, it shows each screen's name; compact,
 * just the icons (named on hover and to screen readers), so an iPad in landscape keeps its width
 * for the work. The logo and the add button stay put at the top and your account at the bottom;
 * only the menu between them scrolls when the window is too short. It starts below the status bar,
 * where iPadOS blurs whatever sits under it.
 */
import { PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react'
import { NavLink } from 'react-router'
import { AccountMenu } from './AccountMenu'
import { NAV } from './nav'
import { SyncLight } from './SyncLight'
import { useAddAction } from './useAddAction'


export function Rail({ compact, onToggle }: { compact: boolean; onToggle: () => void }) {
  const add = useAddAction()
  const toggleLabel = compact ? 'Show screen names' : 'Hide screen names'
  return (
    <aside className={`fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-rule bg-ink pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:flex ${compact ? 'w-16 px-2' : 'w-60 px-4'}`}>
      {compact
        ? <img src="/favicon.svg" alt="JokeBox" className="mx-auto size-9 shrink-0 rounded-lg" />
        : <p className="headline shrink-0 px-2 text-[32px]">JokeBox</p>}
      <button type="button" onClick={add.run} aria-label={compact ? add.label : undefined} title={compact ? add.label : undefined}
        className={`mt-6 flex h-11 shrink-0 items-center gap-2 rounded-lg bg-tape font-semibold text-tape-ink hover:bg-[#f5da77] ${compact ? 'justify-center' : 'px-3'}`}>
        <Plus size={20} /> {!compact && add.label}
      </button>
      {/* Compact, the icons sit closer and the scrollbar goes, so a short iPad screen fits more of them. */}
      <nav className={`-mx-1 mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 ${compact ? 'space-y-0.5 [scrollbar-width:none]' : 'space-y-1'}`} aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} aria-label={compact ? label : undefined} title={compact ? label : undefined}
            className={({ isActive }) => `flex items-center rounded-lg transition-colors ${compact ? 'h-9 justify-center' : 'h-10 gap-3 px-2.5 text-[15px]'} ${isActive ? 'bg-ink-3 text-paper' : 'text-dim hover:text-paper'}`}>
            <Icon size={19} /> {!compact && label}
          </NavLink>
        ))}
      </nav>
      <div className={`shrink-0 border-t border-rule pt-4 ${compact ? 'flex flex-col items-center gap-3' : 'space-y-3'}`}>
        <div className={`flex items-center ${compact ? 'flex-col gap-3' : 'justify-between pl-2'}`}>
          <SyncLight withLabel={!compact} />
          <button type="button" onClick={onToggle} aria-label={toggleLabel} title={toggleLabel}
            className="inline-flex size-9 items-center justify-center rounded-lg text-faint transition-colors hover:bg-ink-3 hover:text-paper">
            {compact ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <AccountMenu showName={!compact} />
      </div>
    </aside>
  )
}
