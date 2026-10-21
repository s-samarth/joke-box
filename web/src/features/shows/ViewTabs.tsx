/**
 * Switch between the list of shows, the timeline and the insights. The choice lives in the URL
 * (?view=timeline), so it survives a reload and can be bookmarked.
 */
import { BarChart3, CalendarDays, List } from 'lucide-react'

export type View = 'list' | 'timeline' | 'insights'

const VIEWS: { key: View; label: string; icon: React.ReactNode }[] = [
  { key: 'list', label: 'Shows', icon: <List size={16} /> },
  { key: 'timeline', label: 'Timeline', icon: <CalendarDays size={16} /> },
  { key: 'insights', label: 'Insights', icon: <BarChart3 size={16} /> },
]

export function ViewTabs({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  return (
    <div role="tablist" aria-label="Shows view" className="flex gap-1 rounded-xl bg-ink-2 p-1">
      {VIEWS.map((v) => (
        <button key={v.key} type="button" role="tab" aria-selected={value === v.key} onClick={() => onChange(v.key)}
          className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm transition sm:flex-none ${value === v.key ? 'bg-ink-4 font-medium text-paper' : 'text-dim hover:text-paper'}`}>
          {v.icon}{v.label}
        </button>
      ))}
    </div>
  )
}
