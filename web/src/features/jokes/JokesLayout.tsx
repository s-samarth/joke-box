/**
 * Jokes: a scannable list, or the same jokes as a map or a web (see ViewSwitch). In the list, an open
 * joke sits beside it (see SplitView); on a phone each opens as its own page. With none open, a wide
 * screen shows the map beside the list, and an iPad gives the list the whole width. A cluster
 * (/jokes/c/:clusterId) opens beside the list the same way.
 */
import { Download, Layers, MoreHorizontal } from 'lucide-react'
import { Outlet, useMatch, useParams } from 'react-router'
import { useClusters, type Cluster } from '../../api/clusters'
import { useJokes, useTopics } from '../../api/library'
import type { Joke, Topic } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { SplitView, WIDE_LIST } from '../../components/ui/SplitView'
import { EmptyState, PageHead, Spinner } from '../../components/ui/pieces'
import { Dropdown } from '../../components/ui/Menu'
import { CLEAN_LABELS, topicName } from '../../lib/jokeMeta'
import { downloadCsv } from '../../lib/csv'
import { long } from '../../lib/duration'
import { formatDateTime, todayIst } from '../../lib/time'
import { useCapture } from '../capture/captureContext'
import { clusterName, leadOf, versionsOf } from './cluster/lead'
import { JokeCount } from './JokeCount'
import { JokeFilters } from './JokeFilters'
import { JokeList } from './JokeList'
import { JokeMapAside, JokeMapScreen } from './map/JokeMapPage'
import { sortDate, useJokeFilters } from './useJokeFilters'
import { ViewSwitch } from './ViewSwitch'

function exportCsv(jokes: Joke[], all: Joke[], topics: Topic[], clusters: Cluster[]) {
  const topicOf = (b: Joke) => topics.find((t) => t.id === b.topic_id)
  const clusterOf = (b: Joke) => {
    if (!b.cluster_id) return ['', '']
    const versions = versionsOf(b.cluster_id, all)
    const cluster = clusters.find((c) => c.id === b.cluster_id)
    return [clusterName(cluster, versions), leadOf(cluster, versions) === b ? 'Yes' : '']
  }
  const headers = ['Setup', 'Punchline', 'Type', 'Topic', 'Subtopic', 'Rating', 'Status', 'Duration', 'Tags', 'Comments', 'Created At', 'Edited At', 'Tag Lines', 'Clean', 'Language', 'Cluster', 'Lead']
  const rows = jokes.map((b) => [
    b.setup, b.punchline, b.types.join('; '), topicName(topicOf(b)), topicOf(b)?.subtopics.find((s) => s.id === b.subtopic_id)?.name ?? '',
    b.strength ?? '', b.status ?? '', long(b.duration_seconds), b.hashtags.join(' '), b.comments, formatDateTime(b.created_at), formatDateTime(b.updated_at),
    b.tag_lines.join(' | '), b.clean_rating ? CLEAN_LABELS[b.clean_rating] : '', b.language ?? '', ...clusterOf(b),
  ])
  downloadCsv(`jokebox-jokes-${todayIst()}.csv`, headers, rows)
}

export function JokesLayout() {
  const { jokeId, clusterId } = useParams()
  const openId = jokeId ?? clusterId
  const onMap = useMatch('/jokes/map')
  const onWeb = useMatch('/jokes/web')
  const view = onMap ? 'map' : onWeb ? 'web' : 'list'
  const f = useJokeFilters()
  const { data: topics = [] } = useTopics()
  const { data: clusters = [] } = useClusters()
  const { data: allJokes = [] } = useJokes()
  const { openCapture } = useCapture()
  const q = f.query ? `?${f.query}` : ''
  const narrowed = f.active || f.hidingDiscarded

  const header = (
    <>
      <PageHead title="Jokes">
        <ViewSwitch current={view} query={f.query} compact={Boolean(openId)} />
        <Dropdown items={[
          { label: f.flat ? 'Stack versions' : 'Show every version', icon: <Layers size={16} />, onSelect: () => f.set({ versions: f.flat ? null : 'all' }) },
          { label: 'Export as CSV', icon: <Download size={16} />, onSelect: () => exportCsv(f.visible, allJokes, topics, clusters), disabled: !f.visible.length },
        ]}
          trigger={<IconButton label="More"><MoreHorizontal size={20} /></IconButton>} />
      </PageHead>
      <JokeFilters f={f} />
      <JokeCount f={f} />
    </>
  )
  // Map and Web take the whole screen under the same header, so the filters still apply.
  if (view !== 'list') return <div className="lg:-mx-4">{header}<Outlet /></div>

  const list = (
    <>
      {header}
      {/* Relative, so the time scrubber can sit down the side of the list without scrolling with it. */}
      <div className="lg:relative lg:-mx-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        {/* Sorted by date, the time scrubber stands in for the scrollbar. */}
        <div className={`lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-3 ${sortDate(f.sort) ? 'no-scrollbar' : ''}`}>
          {f.isPending ? (
            <div className="py-10"><Spinner /></div>
          ) : f.visible.length === 0 ? (
            <EmptyState title={narrowed ? 'Nothing matches' : 'No jokes yet'}
              action={!narrowed && <button type="button" onClick={() => openCapture({ topicId: f.topic ?? undefined, subtopicId: f.sub })} className="text-tape underline-offset-4 hover:underline">Capture your first joke</button>}>
              {f.active ? 'Try another word or clear the filters.' : f.hidingDiscarded ? 'Only discarded jokes are here: Show brings them back.' : 'Tap + whenever a premise hits you.'}
            </EmptyState>
          ) : (
            <JokeList rows={f.rows} topics={topics} sort={f.sort} activeId={openId} flat={f.flat} query={f.query} wide={openId ? '' : WIDE_LIST} />
          )}
        </div>
      </div>
    </>
  )
  return <SplitView list={list} openId={openId} closeTo={`/jokes${q}`} noun={clusterId ? 'cluster' : 'joke'}><Outlet /></SplitView>
}

/** With no joke open, a wide screen shows the map of the list beside it. */
export const NoJokeSelected = () => <JokeMapAside />

/** /jokes/map and /jokes/web: the map or the web on the whole screen. */
export const JokeMapRoute = () => <JokeMapScreen view="map" />
export const JokeWebRoute = () => <JokeMapScreen view="web" />
