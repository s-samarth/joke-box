/**
 * The jokes resting on a premise, on its page: as a list in reading order (chains kept together),
 * where you take one off the premise, or as the premise's web (see PremiseWeb). The switch shows
 * once there's a joke to draw, and this device remembers which you used last.
 */
import { ListPlus, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useSaveJoke } from '../../api/library'
import type { Premise } from '../../api/premises'
import type { Joke, Topic } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { StrengthTicks } from '../../components/ui/pieces'
import { long } from '../../lib/duration'
import { topicName } from '../../lib/jokeMeta'
import { jokesOn, premiseSize } from '../../lib/premises'
import { useCapture } from '../capture/captureContext'
import { toInput } from '../jokes/useAutosaveJoke'
import { AddJokesDialog } from './AddJokesDialog'
import { PremiseWeb } from './PremiseWeb'

type View = 'list' | 'web'
const KEY = 'jokebox.premiseJokesView'

function savedView(): View {
  try {
    return localStorage.getItem(KEY) === 'web' ? 'web' : 'list'
  } catch {
    return 'list'
  }
}

interface Props {
  premise: Premise
  /** The topic the premise is filed under now, edits included. */
  topicId: string
  all: Joke[]
  topics: Topic[]
}

export function PremiseJokes({ premise, topicId, all, topics }: Props) {
  const saveJoke = useSaveJoke()
  const { openCapture } = useCapture()
  const [adding, setAdding] = useState(false)
  const [view, setView] = useState<View>(savedView)
  const jokes = useMemo(() => jokesOn(premise.id, all), [premise.id, all])
  const runtime = jokes.reduce((s, j) => s + j.duration_seconds, 0)
  const showing = jokes.length ? view : 'list'

  const choose = (v: View) => {
    setView(v)
    try {
      localStorage.setItem(KEY, v)
    } catch {
      // Private mode: it just won't be remembered.
    }
  }
  const detach = (id: string) => {
    const joke = all.find((j) => j.id === id)
    if (joke) saveJoke.mutate({ id, input: { ...toInput(joke), premise_id: null } })
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="headline text-2xl">Jokes on it</h2>
        {jokes.length > 0 && (
          <div role="tablist" aria-label="See the jokes as" className="flex rounded-lg bg-ink-3 p-0.5 text-sm">
            {(['list', 'web'] as const).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={showing === v} onClick={() => choose(v)}
                className={`h-8 rounded-md px-3 transition-colors ${showing === v ? 'bg-ink-4 text-paper' : 'text-dim hover:text-paper'}`}>{v === 'list' ? 'List' : 'Web'}</button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-1 text-sm text-dim">
        {premiseSize(jokes.length)}{runtime > 0 && `, ${long(runtime)}`}
        {jokes.length > 0 && <> · <Link to={`/jokes?premise=${premise.id}`} className="text-tape hover:underline">Open in Jokes</Link></>}
      </p>
      {jokes.length === 0 ? (
        <p className="mt-3 text-[15px] text-dim">One premise feeds many setups. Ask "if this is true, what else is true?" and write each answer as a joke.</p>
      ) : showing === 'web' ? (
        <PremiseWeb premise={premise} jokes={jokes} all={all} />
      ) : (
        <ol className="mt-3 divide-y divide-rule border-y border-rule">
          {jokes.map((j) => (
            <li key={j.id} className="flex items-start gap-2 py-3">
              <Link to={`/jokes/${j.id}`} className="min-w-0 flex-1 leading-snug hover:text-tape">
                <span className="line-clamp-2">{j.setup}</span>
                <span className="mt-1 flex items-center gap-3 text-xs text-faint">
                  <StrengthTicks strength={j.strength} />
                  {j.topic_id !== topicId && topicName(topics.find((t) => t.id === j.topic_id))}
                </span>
              </Link>
              <IconButton label="Take it off this premise" onClick={() => detach(j.id)}><X size={16} /></IconButton>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="tape" small icon={<Plus size={15} />} onClick={() => openCapture({ topicId, premiseId: premise.id })}>Write a joke on it</Button>
        <Button variant="quiet" small icon={<ListPlus size={15} />} onClick={() => setAdding(true)}>Add jokes you’ve written</Button>
      </div>
      <AddJokesDialog premise={premise} open={adding} onOpenChange={setAdding} />
    </section>
  )
}
