/**
 * Jokes: a scannable list. On desktop the selected joke opens beside the list (like a mail app);
 * on a phone it opens as its own page.
 */
import { Download, MoreHorizontal } from 'lucide-react'
import { Outlet, useParams } from 'react-router'
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
  const f = useJokeFilters()
  const { data: topics = [] } = useTopics()
  const { openCapture } = useCapture()

  return (
    <div className="lg:-mx-10 lg:flex lg:h-dvh">
      <section className={`lg:flex lg:w-[26rem] lg:shrink-0 lg:flex-col lg:border-r lg:border-rule lg:px-6 ${jokeId ? 'hidden lg:flex' : ''}`}>
        <PageHead title="Jokes">
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
      <section className={`min-w-0 flex-1 lg:overflow-y-auto lg:px-10 ${jokeId ? '' : 'hidden lg:block'}`}>
        <Outlet />
      </section>
    </div>
  )
}

export function NoJokeSelected() {
  return (
    <div className="flex h-full items-center">
      <EmptyState title="Pick a joke">Choose one from the list to read it, rework it or start a rewrite.</EmptyState>
    </div>
  )
}
