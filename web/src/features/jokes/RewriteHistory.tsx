/** Saved versions of this session, and earlier sessions on the same joke. */
import { RotateCcw, Trash2 } from 'lucide-react'
import type { Brainstorm, BrainstormVersion } from '../../api/types'
import { formatDateTime } from '../../lib/time'

interface Props {
  current?: Brainstorm
  others: Brainstorm[]
  onLoadVersion: (v: BrainstormVersion) => void
  onDeleteVersion: (v: BrainstormVersion) => void
  onOpenSession: (b: Brainstorm) => void
  onDeleteSession: (b: Brainstorm) => void
}

function Entry({ title, when, onLoad, onDelete }: { title: string; when: string; onLoad: () => void; onDelete: () => void }) {
  return (
    <li className="flex items-center gap-1">
      <button type="button" onClick={onLoad} className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left hover:bg-ink-3">
        <span className="block truncate">{title}</span>
        <span className="block text-sm text-faint">{when}</span>
      </button>
      <button type="button" aria-label={`Restore ${title}`} title="Restore" onClick={onLoad} className="inline-flex size-9 items-center justify-center rounded-lg text-faint hover:text-paper"><RotateCcw size={15} /></button>
      <button type="button" aria-label={`Delete ${title}`} title="Delete" onClick={onDelete} className="inline-flex size-9 items-center justify-center rounded-lg text-faint hover:text-light"><Trash2 size={15} /></button>
    </li>
  )
}

export function RewriteHistory({ current, others, onLoadVersion, onDeleteVersion, onOpenSession, onDeleteSession }: Props) {
  const versions = [...(current?.versions ?? [])].reverse()
  return (
    <div className="space-y-8">
      <section>
        <h2 className="headline mb-2 text-2xl">This session</h2>
        {versions.length === 0 ? (
          <p className="text-[15px] text-dim">Save to keep a version you can come back to.</p>
        ) : (
          <ul>
            {versions.map((v, i) => (
              <Entry key={v.id} title={`Version ${versions.length - i}${v.title ? `: ${v.title}` : ''}`} when={formatDateTime(v.saved_at)} onLoad={() => onLoadVersion(v)} onDelete={() => onDeleteVersion(v)} />
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="headline mb-2 text-2xl">Earlier sessions</h2>
        {others.length === 0 ? (
          <p className="text-[15px] text-dim">None yet.</p>
        ) : (
          <ul>
            {others.map((b) => (
              <Entry key={b.id} title={b.title || 'Untitled session'} when={formatDateTime(b.updated_at)} onLoad={() => onOpenSession(b)} onDelete={() => onDeleteSession(b)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
