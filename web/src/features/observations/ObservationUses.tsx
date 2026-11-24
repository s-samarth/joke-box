/**
 * On an observation's page: the jokes and premises that came from it (link ones you've already
 * written from the joke and premise sheets, which start on the observation's topic; × unlinks,
 * with Undo), and the brainstorm sessions it's linked to. A session
 * holds that link, so it's made and undone from the session. Writing a new one is above.
 */
import { Lightbulb, Link2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useJokes, useTopics } from '../../api/library'
import { useLinkObservation } from '../../api/notebook'
import { usePremises } from '../../api/premises'
import { useFeedback } from '../../components/ui/feedbackContext'
import type { Observation } from '../../api/types'
import { topicName } from '../../lib/jokeMeta'
import { formatDateTime } from '../../lib/time'
import { LinkedRows } from './LinkedRows'
import { JokePickSheet } from '../pickers/JokePickSheet'
import { PremisePickSheet } from '../pickers/PremisePickSheet'
import { useUses } from './useUsed'

const chip = 'mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-ink-3 px-3 text-[15px] text-dim hover:bg-ink-4 hover:text-paper'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="headline mb-3 text-2xl">{title}</h2>
      {children}
    </section>
  )
}

export function ObservationUses({ observation }: { observation: Observation }) {
  const { data: jokes = [] } = useJokes()
  const { data: premises = [] } = usePremises()
  const { data: topics = [] } = useTopics()
  const link = useLinkObservation()
  const { toast } = useFeedback()
  const sessions = useUses().brainstorms(observation)
  const topic = (id: string) => topicName(topics.find((t) => t.id === id))
  const [picking, setPicking] = useState<'jokes' | 'premises' | null>(null)
  const set = (kind: 'jokes' | 'premises', targetId: string, on: boolean) => link.mutate({ id: observation.id, kind, targetId, on })
  const unlink = (kind: 'jokes' | 'premises', targetId: string) => {
    set(kind, targetId, false)
    toast(kind === 'jokes' ? 'Joke unlinked' : 'Premise unlinked', { label: 'Undo', onClick: () => set(kind, targetId, true) })
  }
  const jokeIds = observation.joke_ids ?? []
  const premiseIds = observation.premise_ids ?? []

  return (
    <>
      <Section title="Jokes from it">
        <LinkedRows rows={jokes.filter((j) => jokeIds.includes(j.id)).map((j) => ({ id: j.id, to: `/jokes/${j.id}`, text: j.setup, sub: topic(j.topic_id) }))}
          empty="No jokes linked yet." unlinkLabel="Unlink this joke" onUnlink={(id) => unlink('jokes', id)} />
        <button type="button" onClick={() => setPicking('jokes')} className={chip}><Link2 size={16} aria-hidden />Link jokes</button>
      </Section>
      <Section title="Premises from it">
        <LinkedRows rows={premises.filter((p) => premiseIds.includes(p.id)).map((p) => ({ id: p.id, to: `/premises/${p.id}`, text: p.take, sub: topic(p.topic_id) }))}
          empty="No premises linked yet." unlinkLabel="Unlink this premise" onUnlink={(id) => unlink('premises', id)} />
        <button type="button" onClick={() => setPicking('premises')} className={chip}><Lightbulb size={16} aria-hidden />Link premises</button>
      </Section>
      <Section title="Brainstorms with it">
        {sessions.length === 0 ? <p className="text-[15px] text-dim">Not in a brainstorm yet. Link it from a session's search box.</p> : (
          <ul className="divide-y divide-rule border-y border-rule">
            {sessions.map((s) => (
              <li key={s.id}><Link to={`/brainstorm/${s.id}`} className="block py-2.5 leading-snug hover:text-tape">
                <span className="line-clamp-2 text-[15px]">{s.title.trim() || s.content.trim().split('\n')[0] || 'Untitled session'}</span>
                <span className="mt-1 block text-xs text-faint">{formatDateTime(s.updated_at)}</span>
              </Link></li>
            ))}
          </ul>
        )}
      </Section>
      {picking === 'jokes' && (
        <JokePickSheet title="Link jokes" description="Jokes that came from this observation. Starts on its topic." onClose={() => setPicking(null)}
          candidates={jokes.filter((j) => !jokeIds.includes(j.id))} start={{ topic: observation.topic_id }} many={['Link', 'joke', 'jokes']}
          onPick={(ids) => ids.forEach((id) => set('jokes', id, true))} />
      )}
      {picking === 'premises' && (
        <PremisePickSheet title="Link premises" description="Premises that came from this observation. Starts on its topic." onClose={() => setPicking(null)}
          candidates={(p) => !premiseIds.includes(p.id)} topicId={observation.topic_id} many={['Link', 'premise', 'premises']}
          onPick={(ids) => ids.forEach((id) => set('premises', id, true))} />
      )}
    </>
  )
}
