import type { SetlistInput } from '../../api/shows'
import type { Setlist } from '../../api/types'

/** A saved set in the shape the API takes back, so it can be changed and saved again. */
export const setlistInput = (s: Setlist): SetlistInput => ({
  name: s.name,
  show_date: s.show_date,
  target_seconds: s.target_seconds,
  venue_name: s.venue_name,
  rating: s.rating ?? null,
  tag_ids: s.tag_ids ?? [],
  items: s.items.map((i) => ({ bit_id: i.bit_id, duration_seconds: i.duration_seconds, optional: i.optional ?? false })),
})
