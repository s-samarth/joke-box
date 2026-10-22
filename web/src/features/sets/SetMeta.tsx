/**
 * A set's rating and tags, under its name. Tap a star to rate (tap it again to clear); tap a tag
 * to put it on or take it off. "Edit tags" opens the sheet where you add, rename and delete them.
 */
import { Settings2, Star } from 'lucide-react'
import { useState } from 'react'
import type { SetlistInput } from '../../api/shows'
import { useSetTags } from '../../api/setTags'
import { tagChip } from './chips'
import { SetTagsSheet } from './SetTagsSheet'

interface Props {
  draft: SetlistInput
  update: (change: (d: SetlistInput) => SetlistInput) => void
}

export function SetMeta({ draft, update }: Props) {
  const { data: tags = [] } = useSetTags()
  const [editing, setEditing] = useState(false)
  const rating = draft.rating ?? 0
  const rate = (n: number) => update((d) => ({ ...d, rating: d.rating === n ? null : n }))
  const toggle = (id: string) =>
    update((d) => ({ ...d, tag_ids: d.tag_ids.includes(id) ? d.tag_ids.filter((t) => t !== id) : [...d.tag_ids, id] }))

  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-14 text-sm text-dim">Rating</span>
        <div className="flex" role="radiogroup" aria-label="Rate this set">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} of 5`} onClick={() => rate(n)}
              className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-ink-3">
              <Star size={22} className={n <= rating ? 'fill-tape text-tape' : 'text-ink-4'} />
            </button>
          ))}
        </div>
        {rating === 0 && <span className="text-sm text-faint">Not rated</span>}
      </div>
      <div className="flex items-start gap-3">
        <span className="w-14 pt-1.5 text-sm text-dim">Tags</span>
        <div className="flex flex-1 flex-wrap gap-1.5" role="group" aria-label="Tags">
          {tags.map((t) => (
            <button key={t.id} type="button" aria-pressed={draft.tag_ids.includes(t.id)} onClick={() => toggle(t.id)} className={tagChip(draft.tag_ids.includes(t.id))}>{t.name}</button>
          ))}
          <button type="button" onClick={() => setEditing(true)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm text-faint hover:bg-ink-3 hover:text-paper">
            <Settings2 size={14} /> Edit tags
          </button>
        </div>
      </div>
      <SetTagsSheet open={editing} onOpenChange={setEditing} />
    </div>
  )
}
