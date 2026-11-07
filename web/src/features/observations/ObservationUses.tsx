/**
 * On an observation's page: the jokes and premises that came from it. Search to link ones you've
 * already written; × unlinks. Writing a new one from it is on the page above.
 */
import type { ReactNode } from 'react'
import { useJokes, useTopics } from '../../api/library'
import { useLinkObservation } from '../../api/notebook'
import { usePremises } from '../../api/premises'
import type { Observation } from '../../api/types'
import { topicName } from '../../lib/jokeMeta'
import { LinkedRows } from './LinkedRows'
import { LinkSearch } from './LinkSearch'

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
  const topic = (id: string) => topicName(topics.find((t) => t.id === id))
  // Suggestions start on the observation's topic, newest first.
  const near = <T extends { topic_id: string; created_at: string }>(items: T[]) => {
    const newest = [...items].sort((a, b) => b.created_at.localeCompare(a.created_at))
    return [...newest.filter((i) => i.topic_id === observation.topic_id), ...newest.filter((i) => i.topic_id !== observation.topic_id)]
  }
  const set = (kind: 'jokes' | 'premises', targetId: string, on: boolean) => link.mutate({ id: observation.id, kind, targetId, on })
  const jokeIds = observation.joke_ids ?? []
  const premiseIds = observation.premise_ids ?? []

  return (
    <>
      <Section title="Jokes from it">
        <LinkedRows rows={jokes.filter((j) => jokeIds.includes(j.id)).map((j) => ({ id: j.id, to: `/jokes/${j.id}`, text: j.setup, sub: topic(j.topic_id) }))}
          empty="No jokes linked yet." unlinkLabel="Unlink this joke" onUnlink={(id) => set('jokes', id, false)} />
        <div className="mt-3">
          <LinkSearch placeholder="Search jokes to link" onPick={(id) => set('jokes', id, true)}
            items={near(jokes.filter((j) => !jokeIds.includes(j.id))).map((j) => ({ id: j.id, text: j.setup, sub: topic(j.topic_id) }))} />
        </div>
      </Section>
      <Section title="Premises from it">
        <LinkedRows rows={premises.filter((p) => premiseIds.includes(p.id)).map((p) => ({ id: p.id, to: `/premises/${p.id}`, text: p.take, sub: topic(p.topic_id) }))}
          empty="No premises linked yet." unlinkLabel="Unlink this premise" onUnlink={(id) => set('premises', id, false)} />
        <div className="mt-3">
          <LinkSearch placeholder="Search premises to link" onPick={(id) => set('premises', id, true)}
            items={near(premises.filter((p) => !premiseIds.includes(p.id))).map((p) => ({ id: p.id, text: p.take, sub: topic(p.topic_id) }))} />
        </div>
      </Section>
    </>
  )
}
