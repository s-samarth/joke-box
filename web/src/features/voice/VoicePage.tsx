/** Voice notes: record, then find and replay your raw thoughts by label or hashtag. */
import { Search } from 'lucide-react'
import { useState } from 'react'
import { EmptyState, PageHead, Spinner } from '../../components/ui/bits'
import { Input } from '../../components/ui/Field'
import { Recorder } from './Recorder'
import { useVoiceLibrary } from './useVoiceLibrary'
import { VoiceNoteRow } from './VoiceNoteRow'
import { FREE_STORAGE_BYTES, WARN_AT, filterNotes, hashtagCounts, megabytes } from './voiceMeta'

/** How much of the free Blob storage the recordings use, so the limit never comes as a surprise. */
function StorageBar({ used }: { used: number }) {
  const share = Math.min(1, used / FREE_STORAGE_BYTES)
  const warn = share >= WARN_AT
  return (
    <div className="mt-10 space-y-1.5">
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-3" role="meter" aria-label="Storage used" aria-valuenow={Math.round(share * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${warn ? 'bg-amber' : 'bg-faint'}`} style={{ width: `${Math.max(share * 100, used ? 1 : 0)}%` }} />
      </div>
      <p className={`text-sm ${warn ? 'text-amber' : 'text-faint'}`}>
        {megabytes(used)} of 1 GB free storage used.{warn && ' Delete old notes you no longer need to make room.'}
      </p>
    </div>
  )
}

export function VoicePage() {
  const { notes, loading, edit, remove, usedBytes } = useVoiceLibrary()
  const [query, setQuery] = useState('')
  const tags = hashtagCounts(notes)
  const shown = filterNotes(notes, query)

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Voice notes" />
      <Recorder />

      {notes.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
            <Input type="search" aria-label="Search voice notes" placeholder="Search labels and hashtags" className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {tags.length > 0 && (
            <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Hashtags">
              {tags.map(([tag, count]) => (
                <button key={tag} type="button" aria-pressed={query === tag} onClick={() => setQuery(query === tag ? '' : tag)}
                  className={`h-8 shrink-0 rounded-lg px-2.5 text-sm transition ${query === tag ? 'bg-paper font-medium text-ink' : 'bg-ink-3 text-dim hover:text-paper'}`}>
                  {tag} <span className="tabular opacity-60">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-12"><Spinner /></div>
      ) : notes.length === 0 ? (
        <div className="mt-8"><EmptyState title="No voice notes yet">Record a thought the moment you have it. Label it now or later.</EmptyState></div>
      ) : shown.length === 0 ? (
        <p className="mt-6 text-dim">No notes match “{query}”.</p>
      ) : (
        <ul className="mt-4 divide-y divide-rule border-y border-rule">
          {shown.map((n) => (
            <VoiceNoteRow key={n.id} note={n} suggestions={tags.map(([t]) => t)} onTag={setQuery} onDelete={() => void remove(n.id)}
              onEdit={(patch) => edit(n.id, { label: n.label, hashtags: n.hashtags, duration_seconds: n.duration_seconds, ...patch })} />
          ))}
        </ul>
      )}
      <StorageBar used={usedBytes} />
    </div>
  )
}
