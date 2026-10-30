/**
 * Jokes: a scannable list. On desktop the selected joke opens beside the list (like a mail app),
 * and with none open the joke map fills that space; on a phone each opens as its own page.
 */
import { Download, Lightbulb, MoreHorizontal, Network } from 'lucide-react'
import { Link, Outlet, useMatch, useParams } from 'react-router'
import { useTopics } from '../../api/library'
import type { Joke, Topic } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { EmptyState, PageHead, Spinner } from '../../components/ui/pieces'
import { Dropdown } from '../../components/ui/Menu'
import { CLEAN_LABELS, topicName } from '../../lib/jokeMeta'
import { downloadCsv } from '../../lib/csv'
import { long } from '../../lib/duration'
import { formatDateTime, todayIst } from '../../lib/time'
import { useCapture } from '../capture/captureContext'
import { JokeFilters } from './JokeFilters'
import { JokeList } from './JokeList'
import { JokeMapPage } from './map/JokeMapPage'
import { sortDate, useJokeFilters } from './useJokeFilters'

function exportCsv(jokes: Joke[], topics: Topic[]) {
  const topicOf = (b: Joke) => topics.find((t) => t.id === b.topic_id)
  const headers = ['Setup', 'Punchline', 'Type', 'Topic', 'Subtopic', 'Rating', 'Status', 'Duration', 'Tags', 'Comments', 'Created At', 'Edited At', 'Tag Lines', 'Clean', 'Language']
  const rows = jokes.map((b) => [
    b.setup, b.punchline, b.types.join('; '), topicName(topicOf(b)), topicOf(b)?.subtopics.find((s) => s.id === b.subtopic_id)?.name ?? '',
    b.strength, b.status ?? '', long(b.duration_seconds), b.hashtags.join(' '), b.comments, formatDateTime(b.created_at), formatDateTime(b.updated_at),
    b.tag_lines.join(' | '), b.clean_rating ? CLEAN_LABELS[b.clean_rating] : '', b.language ?? '',
  ])
  downloadCsv(`jokebox-jokes-${todayIst()}.csv`, headers, rows)
}

export function JokesLayout() {
  const { jokeId } = useParams()
  // On a phone the list gives way to whatever's open: a joke, the map or the premises.
  const onMap = useMatch('/jokes/map')
  const onPremises = useMatch('/jokes/premises/*')
  const open = Boolean(jokeId || onMap || onPremises)
  const f = useJokeFilters()
  const { data: topics = [] } = useTopics()
  const { openCapture } = useCapture()

  return (
    <div className="lg:-mx-10 lg:flex lg:h-dvh">
      <section className={`lg:flex lg:w-[26rem] lg:shrink-0 lg:flex-col lg:border-r lg:border-rule lg:px-6 ${open ? 'hidden lg:flex' : ''}`}>
        <PageHead title="Jokes">
          <Link to="/jokes/premises" aria-label="Premises" title="Premises"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-ink-3 hover:text-paper">
            <Lightbulb size={19} />
          </Link>
          <Link to={`/jokes/map${f.query ? `?${f.query}` : ''}`} aria-label="Joke map and board" title="Joke map and board"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-ink-3 hover:text-paper">
            <Network size={19} />
          </Link>
          <Dropdown items={[{ label: 'Export as CSV', icon: <Download size={16} />, onSelect: () => exportCsv(f.visible, topics), disabled: !f.visible.length }]}
            trigger={<IconButton label="More"><MoreHorizontal size={20} /></IconButton>} />
        </PageHead>
        <JokeFilters f={f} />
        <p className="mt-4 mb-1 text-sm text-faint">{f.active ? `${f.visible.length} of ${f.total} jokes` : `${f.total} jokes`}</p>
        {/* Relative, so the time scrubber can sit down the side of the list without scrolling with it. */}
        <div className="lg:relative lg:-mx-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        {/* Sorted by date, the time scrubber stands in for the scrollbar. */}
        <div className={`lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-3 ${sortDate(f.sort) ? 'no-scrollbar' : ''}`}>
          {f.isPending ? (
            <div className="py-10"><Spinner /></div>
          ) : f.visible.length === 0 ? (
            <EmptyState title={f.active ? 'Nothing matches' : 'No jokes yet'}
              action={!f.active && <button type="button" onClick={() => openCapture({ topicId: f.topic ?? undefined, subtopicId: f.sub })} className="text-tape underline-offset-4 hover:underline">Capture your first joke</button>}>
              {f.active ? 'Try another word or clear the filters.' : 'Tap + whenever a premise hits you.'}
            </EmptyState>
          ) : (
            <JokeList jokes={f.visible} topics={topics} sort={f.sort} activeId={jokeId} query={f.query} />
          )}
        </div>
        </div>
      </section>
      <section className={`min-w-0 flex-1 lg:overflow-y-auto lg:px-10 ${open ? '' : 'hidden lg:block'}`}>
        <Outlet />
      </section>
    </div>
  )
}

/** With no joke open, desktop shows the map of the list beside it. */
export const NoJokeSelected = () => <JokeMapPage />

/** /jokes/map: the map on its own, with a way back to the list on a phone. */
export const JokeMapScreen = () => <JokeMapPage own />
