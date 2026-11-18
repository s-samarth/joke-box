/**
 * Your path as staircases: one step per tick box in your first open Path note, rising left to
 * right. Done steps are filled, the next one is outlined in tape (it's the thing to do), the rest
 * wait. A note with tick boxes under several headings draws one staircase per heading (levels
 * for material, stage and audience, climbed side by side), each with its own next step. Below,
 * when a next step names minutes, your most solid material on one topic against that target.
 */
import { Link } from 'react-router'
import { useCraftNotes } from '../../api/craft'
import { useJokes, useTopics } from '../../api/library'
import { topicName } from '../../lib/jokeMeta'
import { clock } from '../../lib/duration'
import { inlineRuns, type ListItem } from './bodyFormat'
import { mostSolidTopic, nextStep, targetMinutes, type Track } from './path'

const STEP_MIN = 18 // % height of the first step, so it's still visible

function Staircase({ boxes, next, height }: { boxes: ListItem[]; next: ListItem | null; height: string }) {
  const done = boxes.filter((b) => b.checked).length
  return (
    <ol className={`flex items-end gap-1 sm:gap-1.5 ${height}`} aria-label={`${done} of ${boxes.length} steps done`}>
      {boxes.map((b, i) => {
        const isNext = b.line === next?.line
        const tone = b.checked ? 'bg-ok' : isNext ? 'bg-tape/15 ring-2 ring-tape' : 'bg-ink-3'
        return (
          <li key={b.line} className="flex h-full flex-1 flex-col justify-end" aria-current={isNext ? 'step' : undefined}>
            <span className={`block rounded-t-md ${tone}`} style={{ height: `${STEP_MIN + ((100 - STEP_MIN) * (i + 1)) / boxes.length}%` }} />
            <span className={`mt-1 text-center text-[11px] tabular ${isNext ? 'font-semibold text-tape' : 'text-faint'}`}>{i + 1}</span>
          </li>
        )
      })}
    </ol>
  )
}

function StepText({ label, item, clamp }: { label: string; item: ListItem; clamp?: boolean }) {
  return (
    <p className={`text-[15px] leading-snug ${clamp ? 'line-clamp-3' : ''}`}>
      <span className="text-faint">{label}</span>
      {inlineRuns(item.text).map((r, i) => (r.bold ? <strong key={i} className="font-semibold">{r.text}</strong> : <span key={i}>{r.text}</span>))}
    </p>
  )
}

function TrackColumn({ track, compact }: { track: Track; compact?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="flex items-baseline justify-between gap-2">
        <span className="truncate font-semibold">{track.name}</span>
        <span className="text-xs text-dim tabular">{track.done} of {track.boxes.length}</span>
      </p>
      <div className="mt-2"><Staircase boxes={track.boxes} next={track.next} height={compact ? 'h-12' : 'h-16 sm:h-20'} /></div>
      <div className="mt-2">{track.next ? <StepText label="Next: " item={track.next} clamp /> : <p className="text-[15px] text-ok">Every level done</p>}</div>
    </div>
  )
}

export function PathLadder({ compact }: { compact?: boolean }) {
  const { data: notes = [] } = useCraftNotes()
  const { data: jokes = [] } = useJokes()
  const { data: topics = [] } = useTopics()
  const step = nextStep(notes)
  if (!step) return null
  const several = step.tracks.length > 1
  const aiming = several ? step.tracks.map((t) => t.next).find((n) => n && targetMinutes(n.text) !== null) ?? null : step.next
  const target = aiming ? targetMinutes(aiming.text) : null
  const best = mostSolidTopic(jokes)
  const topic = topics.find((t) => t.id === best?.topicId)
  const share = target && best ? Math.min(1, best.seconds / (target * 60)) : 0

  return (
    <Link to={`/craft/${step.note.id}`} className="block rounded-2xl bg-ink-2 p-4 ring-1 ring-rule transition-colors hover:bg-ink-3 sm:p-5">
      <p className="flex items-baseline justify-between gap-3">
        <span className="headline text-2xl">{step.note.title}</span>
        <span className="text-sm text-dim tabular">{step.done} of {step.total}</span>
      </p>
      {several ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-3 sm:gap-4">
          {step.tracks.map((t) => <TrackColumn key={t.boxes[0].line} track={t} compact={compact} />)}
        </div>
      ) : (
        <>
          <div className="mt-4"><Staircase boxes={step.tracks[0].boxes} next={step.next} height={compact ? 'h-14' : 'h-24 sm:h-28'} /></div>
          <div className="mt-3"><StepText label="Next: " item={step.next} /></div>
        </>
      )}
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
