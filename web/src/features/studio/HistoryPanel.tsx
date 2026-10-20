/** This session's saved versions, plus earlier brainstorms on the same bit. */
import { RotateCcw, Trash2 } from 'lucide-react'
import type { Brainstorm, BrainstormVersion } from '../../api/types'
import { formatDateTime } from '../../lib/time'

interface Props {
  current?: Brainstorm
  past: Brainstorm[]
  onLoadVersion: (v: BrainstormVersion) => void
  onDeleteVersion: (v: BrainstormVersion) => void
  onLoadBrainstorm: (b: Brainstorm) => void
  onDeleteBrainstorm: (b: Brainstorm) => void
}

function Item({ title, when, onLoad, onDelete }: { title: string; when: string; onLoad: () => void; onDelete: () => void }) {
  return (
    <li className="group flex items-center gap-1 rounded-xl hover:bg-white/5">
      <button type="button" onClick={onLoad} className="min-w-0 flex-1 px-3 py-2 text-left">
        <p className="truncate text-sm">{title || 'Untitled'}</p>
        <p className="text-xs text-faint">{when}</p>
      </button>
      <button type="button" aria-label="Load" title="Load" onClick={onLoad} className="inline-flex size-9 items-center justify-center rounded-lg text-faint hover:text-text"><RotateCcw size={15} /></button>
      <button type="button" aria-label="Delete" title="Delete" onClick={onDelete} className="inline-flex size-9 items-center justify-center rounded-lg text-faint hover:text-danger"><Trash2 size={15} /></button>
    </li>
  )
}

export function HistoryPanel({ current, past, onLoadVersion, onDeleteVersion, onLoadBrainstorm, onDeleteBrainstorm }: Props) {
  const versions = [...(current?.versions ?? [])].reverse()
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="px-3 text-xs font-medium tracking-wide text-muted uppercase">Versions ({versions.length})</h3>
        {versions.length === 0 ? (
          <p className="px-3 text-sm text-faint">Each save keeps a snapshot here.</p>
        ) : (
          <ul className="space-y-0.5">
            {versions.map((v, i) => (
              <Item key={v.id} title={`v${versions.length - i} · ${v.title || 'Untitled'}`} when={formatDateTime(v.saved_at)} onLoad={() => onLoadVersion(v)} onDelete={() => onDeleteVersion(v)} />
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-2">
        <h3 className="px-3 text-xs font-medium tracking-wide text-muted uppercase">Past brainstorms ({past.length})</h3>
        {past.length === 0 ? (
          <p className="px-3 text-sm text-faint">Nothing else on this bit yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {past.map((b) => (
              <Item key={b.id} title={b.title} when={formatDateTime(b.updated_at)} onLoad={() => onLoadBrainstorm(b)} onDelete={() => onDeleteBrainstorm(b)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
