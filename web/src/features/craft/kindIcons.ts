/** One icon per note kind, shared by the cards, the area folders and the shelf. */
import { BookOpen, ListChecks, Mountain, Sparkles, type LucideIcon } from 'lucide-react'
import type { CraftKind } from '../../api/types'

export const KIND_ICONS: Record<CraftKind, LucideIcon> = { checklist: ListChecks, technique: Sparkles, reference: BookOpen, path: Mountain }
