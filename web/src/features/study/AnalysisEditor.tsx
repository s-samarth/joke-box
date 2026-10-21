/**
 * Write or edit one analysis: the set or bit's name, a link, and your analysis. Opened from a
 * watchlist routine (/analysis/new?watch=…), the name and link are filled in for you.
 * A saved analysis lists its takeaways: craft notes learned from it.
 */
import { ArrowLeft, ExternalLink, GraduationCap, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { newId } from '../../api/client'
import { useCraftNotes } from '../../api/craft'
import { useAnalyses, useDeleteAnalysis, useSaveAnalysis, useWatchlist } from '../../api/study'
import type { AnalysisInput } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/bits'
import { Field, Input, Textarea } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'

function Form({ id, initial, isNew }: { id: string; initial: AnalysisInput; isNew: boolean }) {
  const [form, setForm] = useState(initial)
  const save = useSaveAnalysis()
  const del = useDeleteAnalysis()
  const { data: items = [] } = useWatchlist()
  const navigate = useNavigate()
  const { confirm, toast } = useFeedback()
  const routine = items.find((i) => i.id === form.watch_item_id)
  const link = form.url.trim()
  const linkOk = !link || /^https?:\/\//i.test(link)
  const ready = form.title.trim().length > 0 && linkOk
  const set = (patch: Partial<AnalysisInput>) => setForm((f) => ({ ...f, ...patch }))

  const submit = () => {
    if (!ready) return
    save.mutate({ id, input: { ...form, title: form.title.trim(), url: link } }, { onError: (e) => toast(`Not saved: ${e.message}`) })
    toast(navigator.onLine ? 'Analysis saved' : 'Saved offline, will sync')
    navigate('/analysis')
  }
  const remove = async () => {
    if (!(await confirm({ title: 'Delete this analysis?', message: 'Your write-up is deleted for good.', confirmLabel: 'Delete', danger: true }))) return
    del.mutate(id)
    navigate('/analysis')
  }

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit() }}>
      <Field label="Name of the set or bit">
        <Input value={form.title} maxLength={200} placeholder="e.g. Bill Burr: Sinking Cruise Ships" onChange={(e) => set({ title: e.target.value })} autoFocus={isNew && !form.title} />
      </Field>
      <Field label="Link" hint={linkOk ? undefined : 'Links start with http:// or https://'}>
        <div className="flex gap-2">
          <Input type="url" inputMode="url" value={form.url} maxLength={500} placeholder="https://youtube.com/…" onChange={(e) => set({ url: e.target.value })} />
          {link && linkOk && (
            <a href={link} target="_blank" rel="noopener noreferrer" aria-label="Open link" className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-ink-3 text-dim hover:text-paper sm:size-10"><ExternalLink size={17} /></a>
          )}
        </div>
      </Field>
      {routine && <p className="text-sm text-faint">From your watchlist: #{routine.position} {routine.title}, {routine.comedian}</p>}
      <Field label="Your analysis">
        <Textarea value={form.body} className="min-h-72" placeholder="The premise, where it turns, the tags, the callbacks, why the room went with it, what you'd steal…"
          onChange={(e) => set({ body: e.target.value })} />
      </Field>
      <div className="flex items-center justify-between gap-3">
        {!isNew ? <Button variant="danger" small icon={<Trash2 size={15} />} onClick={remove}>Delete</Button> : <span />}
        <Button variant="tape" type="submit" disabled={!ready}>Save analysis</Button>
      </div>
    </form>
  )
}

/** Craft notes learned from this analysis, and a way to add one. */
function Takeaways({ analysisId }: { analysisId: string }) {
  const { data: notes = [] } = useCraftNotes()
  const mine = notes.filter((n) => n.analysis_id === analysisId)
  return (
    <section className="mt-10 border-t border-rule pt-5">
      <h2 className="headline text-2xl">Takeaways</h2>
      <p className="mt-1 text-sm text-dim">What you'd take from it, kept in Craft.</p>
      <ul className="mt-3 space-y-1.5">
        {mine.map((n) => (
          <li key={n.id}><Link to={`/craft/${n.id}`} className="inline-flex items-center gap-2 hover:text-tape"><GraduationCap size={15} className="text-tape" />{n.title}</Link></li>
        ))}
      </ul>
      <Link to={`/craft/new?analysis=${analysisId}`} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-ink-3 px-3 text-sm hover:bg-ink-4"><Plus size={15} />Save a takeaway</Link>
    </section>
  )
}

export function AnalysisEditor() {
  const { analysisId = 'new' } = useParams()
  const [params] = useSearchParams()
  const [freshId] = useState(newId)
  const { data: analyses, isPending } = useAnalyses()
  const { data: items, isPending: itemsPending } = useWatchlist()
  if (isPending || itemsPending) return <div className="py-16"><Spinner /></div>

  const isNew = analysisId === 'new'
  const existing = analyses?.find((a) => a.id === analysisId)
  const routine = items?.find((i) => i.id === params.get('watch'))
  const initial: AnalysisInput = existing
    ? { title: existing.title, url: existing.url, body: existing.body, watch_item_id: existing.watch_item_id }
    : { title: routine ? [routine.comedian, routine.title].filter(Boolean).join(': ') : '', url: routine?.url ?? '', body: '', watch_item_id: routine?.id ?? null }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="pt-6 pb-5 lg:pt-10">
        <Link to="/analysis" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-paper"><ArrowLeft size={15} /> All analyses</Link>
        <h1 className="headline mt-2 text-[44px] sm:text-[56px]">{isNew ? 'New analysis' : 'Analysis'}</h1>
      </div>
      {!isNew && !existing ? (
        <p className="text-dim">This analysis isn't here. It may have been deleted.</p>
      ) : (
        <>
          <Form key={analysisId} id={existing?.id ?? freshId} initial={initial} isNew={isNew} />
          {existing && <Takeaways analysisId={existing.id} />}
        </>
      )}
    </div>
  )
}
