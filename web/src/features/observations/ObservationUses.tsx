/**
 * On an observation's page: the jokes and premises that came from it (search to link ones you've
 * already written; × unlinks, with Undo), and the brainstorm sessions it's linked to. A session
 * holds that link, so it's made and undone from the session. Writing a new one is above.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useJokes, useTopics } from '../../api/library'
import { useLinkObservation } from '../../api/notebook'
import { usePremises } from '../../api/premises'
import { useFeedback } from '../../components/ui/feedbackContext'
import type { Observation } from '../../api/types'
import { topicName } from '../../lib/jokeMeta'
import { formatDateTime } from '../../lib/time'
import { LinkedRows } from './LinkedRows'
import { LinkSearch } from './LinkSearch'
import { useUses } from './useUsed'

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
  // Suggestions start on the observation's topic, newest first.
  const near = <T extends { topic_id: string; created_at: string }>(items: T[]) => {
    const newest = [...items].sort((a, b) => b.created_at.localeCompare(a.created_at))
    return [...newest.filter((i) => i.topic_id === observation.topic_id), ...newest.filter((i) => i.topic_id !== observation.topic_id)]
  }
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
        <div className="mt-3">
          <LinkSearch placeholder="Search jokes to link" onPick={(id) => set('jokes', id, true)}
            items={near(jokes.filter((j) => !jokeIds.includes(j.id))).map((j) => ({ id: j.id, text: j.setup, sub: topic(j.topic_id) }))} />
        </div>
      </Section>
      <Section title="Premises from it">
        <LinkedRows rows={premises.filter((p) => premiseIds.includes(p.id)).map((p) => ({ id: p.id, to: `/premises/${p.id}`, text: p.take, sub: topic(p.topic_id) }))}
          empty="No premises linked yet." unlinkLabel="Unlink this premise" onUnlink={(id) => unlink('premises', id)} />
        <div className="mt-3">
          <LinkSearch placeholder="Search premises to link" onPick={(id) => set('premises', id, true)}
            items={near(premises.filter((p) => !premiseIds.includes(p.id))).map((p) => ({ id: p.id, text: p.take, sub: topic(p.topic_id) }))} />
        </div>
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
    </>
  )
}
