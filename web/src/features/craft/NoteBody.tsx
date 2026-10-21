/**
 * A craft note's body, formatted. Built from parsed blocks rather than HTML, so nothing in a
 * note can inject markup. Web addresses become links that open in a new tab. Tick boxes are buttons when `onTick` is given, otherwise just marks.
 */
import { Check } from 'lucide-react'
import { inlineRuns, parseBody, type ListItem } from './bodyFormat'

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

function Tick({ item, onTick }: { item: ListItem; onTick?: (line: number) => void }) {
  const box = `mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md ring-1 ${item.checked ? 'bg-ok text-ink ring-ok' : 'ring-rule-strong'}`
  const mark = item.checked && <Check size={14} strokeWidth={3} />
  if (!onTick) return <span className={box} aria-hidden>{mark}</span>
  return (
    <button type="button" role="checkbox" aria-checked={Boolean(item.checked)} aria-label={item.text} onClick={() => onTick(item.line)} className={`${box} hover:ring-tape`}>
      {mark}
    </button>
  )
}

const HEADINGS = { 1: 'headline text-2xl mt-6', 2: 'text-lg font-semibold mt-5', 3: 'font-semibold text-dim mt-4' } as const

export function NoteBody({ body, onTick }: { body: string; onTick?: (line: number) => void }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-paper/90">
      {parseBody(body).map((block, i) => {
        if (block.type === 'heading') return <p key={i} className={`${HEADINGS[block.level]} first:mt-0`}><Inline text={block.text} /></p>
        if (block.type === 'para') return <p key={i} className="whitespace-pre-line"><Inline text={block.text} /></p>
        const List = block.ordered ? 'ol' : 'ul'
        return (
          <List key={i} className={`space-y-1.5 pl-5 ${block.ordered ? 'list-decimal marker:text-faint' : 'list-disc marker:text-faint'}`}>
            {block.items.map((item) => item.checked === null ? (
              <li key={item.line} className={item.nested ? 'ml-5' : ''}><Inline text={item.text} /></li>
            ) : (
              <li key={item.line} className={`flex list-none gap-2.5 ${item.nested ? '' : '-ml-5'}`}>
                <Tick item={item} onTick={onTick} />
                <span className={item.checked ? 'text-dim' : ''}><Inline text={item.text} /></span>
              </li>
            ))}
          </List>
        )
      })}
    </div>
  )
}
