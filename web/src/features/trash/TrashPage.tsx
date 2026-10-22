/**
 * The Trash, like a Mac's: everything you deleted waits here 30 days, then goes for good.
 * Each kind is its own folder (the chips); Put back returns a thing to where it was, and
 * Empty Trash deletes the lot now.
 */
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { TRASH_KINDS, useEmptyTrash, useErase, useRestore, useTrash, type TrashItem, type TrashKind } from '../../api/trash'
import { Button } from '../../components/ui/Button'
import { EmptyState, PageHead, SectionHead, Spinner } from '../../components/ui/pieces'
import { useFeedback } from '../../components/ui/feedbackContext'
import { TrashRow } from './TrashRow'

const chip = (on: boolean) => `h-8 shrink-0 rounded-lg px-3 text-sm transition ${on ? 'bg-paper font-medium text-ink' : 'bg-ink-3 text-dim hover:text-paper'}`
const KIND_ORDER = Object.keys(TRASH_KINDS) as TrashKind[]
const things = (n: number) => `${n} ${n === 1 ? 'thing' : 'things'}`

export function TrashPage() {
  const { data: items = [], isPending, isError } = useTrash()
  const restore = useRestore()
  const erase = useErase()
  const empty = useEmptyTrash()
  const { confirm, toast } = useFeedback()
  const [folder, setFolder] = useState<TrashKind | 'all'>('all')

  const present = KIND_ORDER.filter((k) => items.some((i) => i.kind === k))
  const open = folder !== 'all' && present.includes(folder) ? folder : 'all'
  const shown = (open === 'all' ? present : [open]).map((kind) => ({ kind, rows: items.filter((i) => i.kind === kind) }))

  const putBack = (item: TrashItem) => {
    restore.mutate({ kind: item.kind, id: item.id })
    toast(`Put back in ${TRASH_KINDS[item.kind].label}`)
  }
  const deleteNow = async (item: TrashItem) => {
    if (await confirm({ title: `Delete ${item.title}?`, message: 'It’s deleted for good. You can’t undo this.', confirmLabel: 'Delete now', danger: true })) {
      erase.mutate({ kind: item.kind, id: item.id })
    }
  }
  const emptyAll = async () => {
    if (await confirm({ title: 'Empty the Trash?', message: `${things(items.length)} will be deleted for good. You can’t undo this.`, confirmLabel: 'Empty Trash', danger: true })) {
      empty.mutate()
    }
  }

  if (isPending) return <div className="py-16"><Spinner /></div>

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Trash">
        {items.length > 0 && <Button small variant="danger" icon={<Trash2 size={16} />} onClick={emptyAll}>Empty Trash</Button>}
      </PageHead>
      <p className="text-dim">Things you delete wait here for 30 days, then they’re deleted for good. Sets aren’t kept here.</p>

      {isError && items.length === 0 ? (
        <EmptyState title="Can’t open the Trash">It needs a connection. Try again when you’re back online.</EmptyState>
      ) : items.length === 0 ? (
        <EmptyState title="Trash is empty">Delete a joke, show or note and it waits here for 30 days.</EmptyState>
      ) : (
        <>
          <div className="mt-5 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1" role="group" aria-label="Show">
            <button type="button" aria-pressed={open === 'all'} onClick={() => setFolder('all')} className={chip(open === 'all')}>All <span className="tabular">{items.length}</span></button>
            {present.map((k) => (
              <button key={k} type="button" aria-pressed={open === k} onClick={() => setFolder(k)} className={chip(open === k)}>
                {TRASH_KINDS[k].label} <span className="tabular">{items.filter((i) => i.kind === k).length}</span>
              </button>
            ))}
          </div>
          {shown.map(({ kind, rows }) => (
            <section key={kind} className="mt-8">
              {open === 'all' && <SectionHead title={TRASH_KINDS[kind].label} />}
              <ul className="space-y-2">
                {rows.map((item) => <TrashRow key={item.id} item={item} onRestore={() => putBack(item)} onErase={() => void deleteNow(item)} />)}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
