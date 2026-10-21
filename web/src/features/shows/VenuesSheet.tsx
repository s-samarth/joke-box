/**
 * Your venues, with how many shows and sets each has. Delete a typo or a room you merged: if
 * shows or sets use it, pick the venue they move to first, so no show loses where it happened.
 * Picking the same name twice is how you merge duplicates like "Street" and "Street Mic".
 */
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useDeleteVenue, useVenues } from '../../api/shows'
import type { Venue } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const usage = (v: Venue) => (v.shows || v.sets ? [v.shows && plural(v.shows, 'show'), v.sets && plural(v.sets, 'set')].filter(Boolean).join(', ') : 'Not used')

function VenueRow({ venue, others }: { venue: Venue; others: Venue[] }) {
  const del = useDeleteVenue()
  const { confirm, toast } = useFeedback()
  const used = venue.shows + venue.sets > 0
  const [moving, setMoving] = useState(false)
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? '')

  const remove = async () => {
    const target = others.find((v) => v.id === moveTo)
    const verb = venue.shows + venue.sets === 1 ? 'moves' : 'move'
    const message = used ? `Its ${usage(venue).toLowerCase().replace(', ', ' and ')} ${verb} to ${target?.name}.` : 'No shows or sets use it.'
    if (!(await confirm({ title: `Delete ${venue.name}?`, message, confirmLabel: 'Delete venue', danger: true }))) return
    del.mutate({ id: venue.id, moveTo: used ? moveTo : undefined }, { onSuccess: () => toast(`${venue.name} deleted`), onError: (e) => toast(e.message) })
  }

  return (
    <li className="py-2">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate">{venue.name}</span>
          <span className="block text-xs text-faint">{usage(venue)}</span>
        </span>
        <IconButton label={`Delete ${venue.name}`} disabled={del.isPending || (used && !others.length)}
          onClick={() => (used ? setMoving((m) => !m) : void remove())}><Trash2 size={16} /></IconButton>
      </div>
      {moving && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-ink-3/60 p-3">
          <span className="text-sm text-dim">Move its {usage(venue).toLowerCase()} to</span>
          <Select aria-label="Move to venue" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="min-w-0 flex-1">
            {others.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
          <Button variant="danger" small icon={<Trash2 size={15} />} disabled={!moveTo} onClick={() => void remove()}>Delete venue</Button>
        </div>
      )}
    </li>
  )
}

export function VenuesSheet({ onClose }: { onClose: () => void }) {
  const { data: venues = [] } = useVenues()
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Venues" description="Delete one you don't need. Its shows and sets move to another venue first.">
      {venues.length ? (
        <ul className="divide-y divide-rule border-y border-rule">
          {venues.map((v) => <VenueRow key={v.id} venue={v} others={venues.filter((o) => o.id !== v.id)} />)}
        </ul>
      ) : (
        <p className="text-dim">No venues yet. They're added when you log a show or give a set a venue.</p>
      )}
    </Modal>
  )
}
