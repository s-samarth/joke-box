/**
 * A craft note's body, formatted. Built from parsed blocks rather than HTML, so nothing in a
 * note can inject markup. Web addresses become links that open in a new tab. Tick boxes are buttons when `onTick` is given, otherwise just marks.
 */
import { ChevronRight } from 'lucide-react'
import { inlineRuns, parseBody } from './bodyFormat'
import { NoteList } from './NoteList'
import { NoteTable } from './NoteTable'

function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineRuns(text).map((r, i) => {
        if (r.href) return <a key={i} href={r.href} target="_blank" rel="noopener noreferrer" className="break-all text-tape underline decoration-tape/40 underline-offset-2 hover:decoration-tape">{r.text}</a>
        return r.bold ? <strong key={i} className="font-semibold text-paper">{r.text}</strong> : <span key={i}>{r.text}</span>
      })}
    </>
  )
}

const inline = (text: string) => <Inline text={text} />

/** Steps joined by arrows, drawn as chips that wrap onto the next line on a phone. */
function Flow({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2" aria-label="Steps">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={15} aria-hidden className="text-faint" />}
          <span className="rounded-lg bg-ink-3 px-2.5 py-1 text-sm font-medium text-paper ring-1 ring-rule-strong">{inline(s)}</span>
        </li>
      ))}
    </ol>
  )
}

const HEADINGS = { 1: 'headline text-2xl mt-7', 2: 'text-lg font-semibold mt-6', 3: 'font-semibold text-dim mt-4' } as const

export function NoteBody({ body, onTick }: { body: string; onTick?: (line: number) => void }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-paper/90">
      {parseBody(body).map((block, i) => {
        switch (block.type) {
          case 'heading':
            return <p key={i} className={`${HEADINGS[block.level]} first:mt-0`}>{inline(block.text)}</p>
          case 'para':
            return <p key={i} className="whitespace-pre-line">{inline(block.text)}</p>
          case 'table':
            return <NoteTable key={i} head={block.head} rows={block.rows} cell={inline} />
          case 'quote':
            return <p key={i} className="whitespace-pre-line rounded-r-xl border-l-2 border-tape bg-tape/[0.07] px-4 py-2.5 text-paper">{inline(block.text)}</p>
          case 'flow':
            return <Flow key={i} steps={block.steps} />
          case 'rule':
            return <hr key={i} className="my-5 border-rule" />
          case 'list':
            return <NoteList key={i} ordered={block.ordered} items={block.items} inline={inline} onTick={onTick} />
        }
      })}
    </div>
  )
}
