/**
 * Every main screen, in one place, so the desktop rail and the phone bar can't drift apart.
 * Desktop lists them all in the rail. Phone: the bottom bar holds the everyday ones (its Ideas tab
 * opens Premises or Observations, see ideas.ts), and everything else sits in the More sheet,
 * grouped by what you're doing.
 */
import type { LucideIcon } from 'lucide-react'
import { AudioLines, Lightbulb, CalendarCheck, GraduationCap, Eye, Home, ListChecks, ListOrdered, Mic, NotebookPen, PenLine, Search, StickyNote, Trash2 } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Match only this exact path (Home), not everything under it. */
  end?: boolean
  /** One line under the label in the More sheet. */
  hint?: string
}

const home: NavItem = { to: '/', label: 'Home', icon: Home, end: true }
const jokes: NavItem = { to: '/jokes', label: 'Jokes', icon: StickyNote }
const premises: NavItem = { to: '/premises', label: 'Premises', icon: Lightbulb, hint: 'The ideas under your jokes' }
const daily: NavItem = { to: '/daily', label: 'Daily activity', icon: CalendarCheck, hint: 'Jokes, premises and observations, day by day' }
const sets: NavItem = { to: '/sets', label: 'Sets', icon: ListOrdered, hint: 'Build a setlist and run it on stage' }
const voice: NavItem = { to: '/voice', label: 'Voice notes', icon: AudioLines, hint: 'Record an idea out loud' }
const observations: NavItem = { to: '/observations', label: 'Observations', icon: Eye, hint: "Things you noticed, before they're jokes" }
const brainstorm: NavItem = { to: '/brainstorm', label: 'Brainstorm', icon: PenLine, hint: 'Timed writing sessions' }
const shows: NavItem = { to: '/shows', label: 'Shows', icon: Mic, hint: 'Log a mic and see how sets went' }
const craft: NavItem = { to: '/craft', label: 'Craft', icon: GraduationCap, hint: 'What you know about doing stand-up' }
const watchlist: NavItem = { to: '/watchlist', label: 'Watchlist', icon: ListChecks, hint: 'Routines to study' }
const analysis: NavItem = { to: '/analysis', label: 'Analysis', icon: NotebookPen, hint: 'Your write-ups of sets and jokes' }
const search: NavItem = { to: '/search', label: 'Search', icon: Search, hint: 'Find anything you’ve written' }
const trash: NavItem = { to: '/trash', label: 'Trash', icon: Trash2, hint: 'What you deleted, kept for 30 days' }

/** The desktop rail, top to bottom. */
export const NAV: NavItem[] = [home, search, jokes, premises, daily, observations, brainstorm, voice, sets, shows, craft, watchlist, analysis, trash]

/** Phone bottom bar: two either side of the + button. Right of it sit Ideas (see BottomBar) and More. */
export const BAR_LEFT: NavItem[] = [home, jokes]

export const MORE_GROUPS: { title: string; items: NavItem[] }[] = [
  { title: 'Find', items: [search] },
  { title: 'Write', items: [daily, voice, brainstorm] },
  { title: 'Perform', items: [sets, shows] },
  { title: 'Study', items: [craft, watchlist, analysis] },
  { title: 'Deleted', items: [trash] },
]

/** Is this pathname inside one of the More screens? Then the More tab shows as current. */
export const inMore = (pathname: string): boolean =>
  MORE_GROUPS.some((g) => g.items.some((i) => pathname === i.to || pathname.startsWith(`${i.to}/`)))
