/**
 * "Premise" on a joke: the idea it rests on. Picking opens the premise sheet with the Premises
 * tab's filters, starting on the joke's topic; a joke from any topic can rest on any premise, so
 * clearing the filters reaches them all. New premise starts one on the joke's topic.
 */
import { Lightbulb, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { usePremises } from '../../api/premises'
import { PremisePickSheet } from '../pickers/PremisePickSheet'
import { NewPremiseDialog } from './NewPremiseDialog'

const chip = 'inline-flex h-10 items-center gap-2 rounded-lg bg-ink-3 px-3 text-[15px] hover:bg-ink-4'

interface Props {
  value: string | null
  /** The joke's topic: the filters start there, and a new premise starts there. */
  topicId: string
  onChange: (id: string | null) => void
}

export function PremiseField({ value, topicId, onChange }: Props) {
  const { data: premises = [] } = usePremises()
  const [picking, setPicking] = useState(false)
  const [creating, setCreating] = useState(false)
  const current = premises.find((p) => p.id === value)
  const pick = (id: string | null) => {
    onChange(id)
    setPicking(false)
  }

  return (
    <>
      {value ? (
        <div className="space-y-2">
          {current
            ? <Link to={`/premises/${current.id}`} className="line-clamp-2 rounded-lg bg-ink-3 px-3 py-2.5 leading-snug hover:bg-ink-4">{current.take}</Link>
            : <p className="text-dim">A premise that's been deleted</p>}
          <div className="flex gap-5 text-sm">
            <button type="button" onClick={() => setPicking(true)} className="text-tape hover:underline">Change</button>
            <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 text-dim hover:text-paper"><X size={14} /> Remove</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setPicking(true)} className={`${chip} text-dim hover:text-paper`}><Lightbulb size={16} /> Add to a premise</button>
      )}
      {picking && (
        <PremisePickSheet title="Which premise does it rest on?" description="Starts on this joke's topic. Clear the filters for any premise." onClose={() => setPicking(false)}
          topicId={topicId} current={value} onPick={([id]) => pick(id)}
          after={<button type="button" onClick={() => setCreating(true)} className={`${chip} mt-3 text-dim hover:text-paper`}><Plus size={16} /> New premise</button>} />
      )}
      <NewPremiseDialog open={creating} onOpenChange={setCreating} topicId={topicId} onCreated={pick} />
    </>
  )
}
