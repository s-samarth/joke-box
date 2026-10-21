/**
 * "2 changes couldn't sync": a strip above the page whenever a waiting save failed for good. It
 * opens the list, where each one shows what you wrote, why it failed, and Retry, Copy or Discard.
 * Nothing leaves the phone until you choose.
 */
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Copy, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { discardUnsynced, retryUnsynced, summary, useUnsynced, type Unsynced } from '../api/unsynced'
import { Button } from '../components/ui/Button'
import { useFeedback } from '../components/ui/feedbackContext'
import { Modal } from '../components/ui/Modal'
import { formatDateTime } from '../lib/time'

function Item({ item }: { item: Unsynced }) {
  const qc = useQueryClient()
  const { confirm, toast } = useFeedback()
  const { title, text } = summary(item.key, item.variables)
  const copy = () => navigator.clipboard.writeText(text).then(() => toast('Copied'), () => toast("Couldn't copy"))
  const discard = async () => {
    if (await confirm({ title: `Discard this ${title.toLowerCase()}?`, message: 'It won’t be saved anywhere.', confirmLabel: 'Discard', danger: true })) void discardUnsynced(item.id)
  }
  return (
    <li className="py-4">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-faint">{formatDateTime(item.at)}. {item.reason}</p>
      {text && <p className="mt-2 line-clamp-4 rounded-lg bg-ink-3 px-3 py-2 text-sm whitespace-pre-wrap">{text}</p>}
      <div className="mt-2 flex flex-wrap gap-1">
        <Button small icon={<RotateCcw size={15} />} onClick={() => void retryUnsynced(qc, item)}>Retry</Button>
        {text && <Button small variant="quiet" icon={<Copy size={15} />} onClick={copy}>Copy</Button>}
        <Button small variant="danger" icon={<Trash2 size={15} />} onClick={() => void discard()}>Discard</Button>
      </div>
    </li>
  )
}

export function UnsyncedBanner() {
  const items = useUnsynced()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  if (!items.length) return null
  const count = items.length === 1 ? '1 change' : `${items.length} changes`
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center gap-2 rounded-lg bg-light/10 px-3 py-2.5 text-left text-sm text-light ring-1 ring-light/30 hover:bg-light/15">
        <AlertTriangle size={17} className="shrink-0" /> <span className="flex-1">{count} couldn’t sync. Nothing is lost yet.</span>
        <span className="font-medium">Review</span>
      </button>
      <Modal open={open} onOpenChange={setOpen} title="Couldn’t sync"
        description="Kept on this phone. Retry once the problem is fixed, or copy what you wrote."
        footer={<Button variant="tape" onClick={() => items.forEach((i) => void retryUnsynced(qc, i))}>Retry all</Button>}>
        <ul className="divide-y divide-rule">{items.map((i) => <Item key={i.id} item={i} />)}</ul>
      </Modal>
    </>
  )
}
