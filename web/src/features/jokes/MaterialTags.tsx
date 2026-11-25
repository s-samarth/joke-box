/**
 * Vibe and Generic as two small menus, for a joke in a set or a premise in a set: tap to pick.
 * Vibe reads "Vibe" (with Not sure's orange dot) until it's set, then wears its colour (vibeTone). Generic shows an amber "Generic?" until it's answered,
 * because every joke and premise should have one (it never blocks a save).
 */
import { ChevronDown } from 'lucide-react'
import { Dropdown, type MenuItem } from '../../components/ui/Menu'
import { GENERIC_ASK, NOT_SURE, VIBE, genericLabel, personaLabel, usePersonaField } from './persona'
import { VibeDot } from './VibeDot'
import { genericTone, vibeTone } from './vibeTone'

const chip = 'inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] font-semibold transition-colors pointer-coarse:h-10'

export interface Tags { persona?: string | null; generic?: boolean | null }

export function MaterialTags({ value, onChange, what }: { value: Tags; onChange: (patch: Tags) => void; what: string }) {
  const field = usePersonaField()
  const vibe = personaLabel(value.persona, field)
  const vibeId = vibe ? value.persona : null
  const generic = genericLabel(value.generic)
  const vibeItems: MenuItem[] = [
    ...(field?.options ?? []).map((o) => ({ label: o.label, icon: <VibeDot id={o.id} />, onSelect: () => onChange({ persona: o.id }), checked: vibe === o.label })),
    { label: NOT_SURE, icon: <VibeDot id={null} />, onSelect: () => onChange({ persona: null }), checked: !vibe },
  ]
  const genericItems: MenuItem[] = [
    { label: 'Generic', onSelect: () => onChange({ generic: true }), checked: value.generic === true },
    { label: 'Non-generic', onSelect: () => onChange({ generic: false }), checked: value.generic === false },
  ]
  return (
    <>
      {field && (
        <Dropdown align="start" items={vibeItems} trigger={
          <button type="button" aria-label={`${VIBE} of ${what}: ${vibe ?? NOT_SURE}`} className={`${chip} ${vibe ? vibeTone(vibeId).chip : 'text-dim hover:bg-ink-3'}`}>
            {!vibe && <VibeDot id={null} />}{vibe ?? VIBE}<ChevronDown size={13} className="text-faint" />
          </button>
        } />
      )}
      <Dropdown align="start" items={genericItems} trigger={
        <button type="button" aria-label={`Generic or not, ${what}: ${generic ?? 'not answered'}`} className={`${chip} ${value.generic != null ? genericTone(value.generic).chip : 'bg-amber/15 text-amber'}`}>
          {generic ?? GENERIC_ASK}<ChevronDown size={13} className="opacity-60" />
        </button>
      } />
    </>
  )
}
