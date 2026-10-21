/**
 * Your path as a staircase: one step per tick box in your first open Path note, rising left to
 * right. Done steps are filled, the next one is outlined in tape (it's the thing to do), the rest
 * wait. Below it, the next step in words and, when it names minutes, your most solid material on
 * one topic against that target.
 */
import { Link } from 'react-router'
import { useCraftNotes } from '../../api/craft'
import { useBits, useTopics } from '../../api/library'
import { topicName } from '../../lib/bitMeta'
import { clock } from '../../lib/duration'
import { inlineRuns, listItems } from './bodyFormat'
import { mostSolidTopic, nextStep, targetMinutes } from './path'

const STEP_MIN = 18 // % height of the first step, so it's still visible

export function PathLadder({ compact }: { compact?: boolean }) {
  const { data: notes = [] } = useCraftNotes()
  const { data: bits = [] } = useBits()
  const { data: topics = [] } = useTopics()
  const step = nextStep(notes)
  if (!step) return null
  const boxes = listItems(step.note.body).filter((i) => i.checked !== null)
  const target = targetMinutes(step.next.text)
  const best = mostSolidTopic(bits)
  const topic = topics.find((t) => t.id === best?.topicId)
  const share = target && best ? Math.min(1, best.seconds / (target * 60)) : 0

  return (
    <Link to={`/craft/${step.note.id}`} className="block rounded-2xl bg-ink-2 p-4 ring-1 ring-rule transition-colors hover:bg-ink-3 sm:p-5">
      <p className="flex items-baseline justify-between gap-3">
        <span className="headline text-2xl">{step.note.title}</span>
        <span className="text-sm text-dim tabular">{step.done} of {step.total}</span>
      </p>
      <ol className={`mt-4 flex items-end gap-1 sm:gap-1.5 ${compact ? 'h-14' : 'h-24 sm:h-28'}`} aria-label={`${step.done} of ${step.total} steps done`}>
        {boxes.map((b, i) => {
          const isNext = b.line === step.next.line
          const tone = b.checked ? 'bg-ok' : isNext ? 'bg-tape/15 ring-2 ring-tape' : 'bg-ink-3'
          return (
            <li key={b.line} className="flex h-full flex-1 flex-col justify-end" aria-current={isNext ? 'step' : undefined}>
              <span className={`block rounded-t-md ${tone}`} style={{ height: `${STEP_MIN + ((100 - STEP_MIN) * (i + 1)) / boxes.length}%` }} />
              <span className={`mt-1 text-center text-[11px] tabular ${isNext ? 'font-semibold text-tape' : 'text-faint'}`}>{i + 1}</span>
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-[15px] leading-snug">
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
