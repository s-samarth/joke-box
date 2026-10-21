/**
 * Where you are on your path, from your first Path note with tick boxes still open: how many
 * steps are done and the next one. When the next step names minutes, it shows how much solid
 * material (Strong or Killer jokes) you have on your best topic against that target.
 */
import { Link } from 'react-router'
import { useCraftNotes } from '../../api/craft'
import { useBits, useTopics } from '../../api/library'
import { topicName } from '../../lib/bitMeta'
import { clock } from '../../lib/duration'
import { inlineRuns } from '../craft/bodyFormat'
import { mostSolidTopic, nextStep, targetMinutes } from '../craft/path'

export function PathCard() {
  const { data: notes = [] } = useCraftNotes()
  const { data: bits = [] } = useBits()
  const { data: topics = [] } = useTopics()
  const step = nextStep(notes)
  if (!step) return null
  const target = targetMinutes(step.next.text)
  const best = mostSolidTopic(bits)
  const topic = topics.find((t) => t.id === best?.topicId)
  const share = target && best ? Math.min(1, best.seconds / (target * 60)) : 0

  return (
    <Link to={`/craft/${step.note.id}`} className="block rounded-xl bg-ink-2 p-4 ring-1 ring-rule transition-colors hover:bg-ink-3">
      <p className="flex items-baseline justify-between gap-3 text-sm text-dim">
        <span>{step.note.title}</span>
        <span className="tabular">{step.done} of {step.total} done</span>
      </p>
      <p className="mt-2 text-[17px] leading-snug">
        <span className="text-faint">Next: </span>
        {inlineRuns(step.next.text).map((r, i) => (r.bold ? <strong key={i} className="font-semibold">{r.text}</strong> : <span key={i}>{r.text}</span>))}
      </p>
      {target !== null && (
        <div className="mt-3">
          <p className="text-sm text-dim tabular">
            {best && topic ? <>Most solid material on one topic: {topicName(topic)}, {clock(best.seconds)} of {clock(target * 60)}</> : <>No Strong or Killer jokes with a runtime yet</>}
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-3"><div className="h-full rounded-full bg-ok" style={{ width: `${share * 100}%` }} /></div>
        </div>
      )}
    </Link>
  )
}
