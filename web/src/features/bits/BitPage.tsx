/**
 * One bit, one page. The words are edited in place (no form popup), details sit below, then
 * its rewrites and sets. Every change saves on its own, offline included.
 */
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useBits, useDeleteBit } from '../../api/library'
import type { Bit } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { EmptyState, Spinner } from '../../components/ui/bits'
import { GrowingText, Textarea } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'
import { formatDateTime } from '../../lib/time'
import { BitDetails } from './BitDetails'
import { BitExtras } from './BitExtras'
import { TagLines } from './TagLines'
import { useAutosaveBit } from './useAutosaveBit'

function Editor({ bit }: { bit: Bit }) {
  const { draft, update } = useAutosaveBit(bit)
  const remove = useDeleteBit()
  const { confirm, toast } = useFeedback()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const back = `/bits${params.toString() ? `?${params}` : ''}`

  const onDelete = async () => {
    const ok = await confirm({ title: 'Delete this joke?', message: 'Its rewrites and its places in sets go too.', confirmLabel: 'Delete joke', danger: true })
    if (!ok) return
    remove.mutate(bit.id, { onError: (e) => toast(`Not deleted: ${e.message}`) })
    navigate(back)
    toast('Joke deleted')
  }

  return (
    <article className="mx-auto max-w-2xl pb-10">
      <Link to={back} className="inline-flex h-12 items-center gap-1.5 text-dim hover:text-paper lg:hidden"><ArrowLeft size={18} /> Jokes</Link>
      <div className="pt-2 lg:pt-10">
        <GrowingText aria-label="Setup" placeholder="The premise" className="text-[26px] leading-tight font-medium sm:text-[30px]" value={draft.setup}
          onChange={(e) => update({ setup: e.target.value })} />
        <GrowingText aria-label="Punchline" placeholder="The punch" className="mt-4 text-[26px] leading-tight text-tape sm:text-[30px]" value={draft.punchline}
          onChange={(e) => update({ punchline: e.target.value })} />
        {!draft.setup.trim() && <p className="mt-2 text-sm text-light">A joke needs a premise to be saved.</p>}
      </div>
      <div className="mt-6"><TagLines lines={draft.tag_lines} onChange={(tag_lines) => update({ tag_lines })} /></div>
      <div className="mt-10"><BitDetails draft={draft} update={update} /></div>
      <div className="mt-8">
        <label htmlFor="bit-notes" className="text-sm text-dim">Notes</label>
        <Textarea id="bit-notes" className="mt-2" placeholder="Where it kills, where it dies, what to try next" value={draft.comments} onChange={(e) => update({ comments: e.target.value })} />
      </div>
      <div className="mt-12"><BitExtras bit={bit} /></div>
      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5 text-sm text-faint">
        <span>Written {formatDateTime(bit.created_at)}. Last changed {formatDateTime(bit.updated_at)}.</span>
        <Button variant="danger" small icon={<Trash2 size={15} />} onClick={onDelete}>Delete joke</Button>
      </footer>
    </article>
  )
}

export function BitPage() {
  const { bitId } = useParams()
  const { data: bits, isPending } = useBits()
  const bit = bits?.find((b) => b.id === bitId)
  if (isPending && !bits) return <div className="py-16"><Spinner /></div>
  if (!bit) return <EmptyState title="Joke not found" action={<Link to="/bits" className="text-tape">Back to jokes</Link>}>It may have been deleted.</EmptyState>
  return <Editor key={bit.id} bit={bit} />
}
