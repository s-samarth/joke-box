/**
 * Import: pick a prepared folder (import.json + audio/) and add what's in it to JokeBox.
 * Not in the navigation; it's reached from the avatar menu, since it's used once in a while.
 *
 * Pattern: a folder picker. `<input type="file" webkitdirectory>` hands back every file inside the
 * chosen folder as a flat FileList; each File's `webkitRelativePath` says where it sat
 * ("bundle/audio/x.webm"). Nothing is uploaded until you press Import.
 */
import { useQueryClient } from '@tanstack/react-query'
import { FolderOpen } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router'
import { useBits, useTopics } from '../../api/library'
import { useObservations, useObservationTopics } from '../../api/notebook'
import { useVoiceNotes } from '../../api/voice'
import { Button } from '../../components/ui/Button'
import { PageHead } from '../../components/ui/bits'
import { normalise, parseBundle, planImport, topicNames, type ImportPlan } from './bundle'
import { runImport, type Progress } from './runImport'

// Not in React's types: lets the file input pick a whole folder.
const folderPicker = { webkitdirectory: '', directory: '' } as Record<string, string>

export function ImportPage() {
  const qc = useQueryClient()
  const { data: bits = [] } = useBits()
  const { data: observations = [] } = useObservations()
  const { data: notes = [] } = useVoiceNotes()
  const { data: topics = [] } = useTopics()
  const { data: observationTopics = [] } = useObservationTopics()
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [audio, setAudio] = useState(new Map<string, File>())
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<Progress | null>(null)
  const [finished, setFinished] = useState(false)

  async function choose(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])]
    setError('')
    setPlan(null)
    setFinished(false)
    const json = files.find((f) => f.name === 'import.json')
    if (!json) return setError('That folder has no import.json in it. Pick the import folder itself.')
    try {
      const bundle = parseBundle(await json.text())
      setAudio(new Map(files.filter((f) => f.webkitRelativePath.includes('/audio/')).map((f) => [f.name, f])))
      setPlan(planImport(bundle, {
        ids: new Set([...bits, ...observations, ...notes].map((x) => x.id)),
        jokeSetups: new Set(bits.map((b) => normalise(b.setup))),
        observationTexts: new Set(observations.map((o) => normalise(o.text))),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function start() {
    if (!plan) return
    setProgress({ done: 0, total: 0, failures: [] })
    const result = await runImport(plan, { topics, observationTopics, audio, onProgress: setProgress })
    setProgress(result)
    setFinished(true)
    void qc.invalidateQueries()
  }

  const running = progress !== null && !finished
  const newTopics = plan ? topicNames(plan.jokes).filter((n) => !topics.some((t) => t.name.toLowerCase() === n.toLowerCase())) : []

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Import" />
      <p className="-mt-2 mb-6 text-dim">
        Add jokes, observations and voice notes from a prepared import folder. Use a laptop: phones can't pick folders.
        Items already in JokeBox are skipped, so importing the same folder twice is safe.
      </p>

      <label className={`flex cursor-pointer items-center gap-3 rounded-xl bg-ink-2 p-4 ring-1 ring-rule hover:bg-ink-3 ${running ? 'pointer-events-none opacity-50' : ''}`}>
        <FolderOpen size={20} className="text-tape" aria-hidden />
        <span>Choose the import folder</span>
        <input type="file" className="sr-only" onChange={(e) => void choose(e)} {...folderPicker} />
      </label>
      {error && <p className="mt-4 rounded-lg bg-light/10 px-4 py-3 text-sm text-light" role="alert">{error}</p>}

      {plan && (
        <section className="mt-6 rounded-xl bg-ink-2 p-4 ring-1 ring-rule">
          <ul className="space-y-1">
            <li><b className="tabular">{plan.jokes.length}</b> jokes{newTopics.length > 0 && <span className="text-dim"> (new topics: {newTopics.join(', ')})</span>}</li>
            <li><b className="tabular">{plan.observations.length}</b> observations</li>
            <li><b className="tabular">{plan.voiceNotes.length}</b> voice notes</li>
            {plan.skipped > 0 && <li className="text-dim">{plan.skipped} already in JokeBox, skipped</li>}
          </ul>
          {!progress && (
            <Button variant="tape" className="mt-4" disabled={!plan.jokes.length && !plan.observations.length && !plan.voiceNotes.length} onClick={() => void start()}>
              Import
            </Button>
          )}
        </section>
      )}

      {progress && (
        <section className="mt-6" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-ink-3">
            <div className="h-full bg-tape transition-[width]" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
          </div>
          <p className="mt-2 text-sm text-dim tabular">
            {finished ? 'Done. ' : 'Importing… keep this tab open. '}{progress.done} of {progress.total}
            {progress.failures.length > 0 && `, ${progress.failures.length} failed`}
          </p>
          {finished && (
            <p className="mt-4 flex gap-4 text-tape">
              <Link to="/bits">Jokes</Link><Link to="/observations">Observations</Link><Link to="/voice">Voice notes</Link>
            </p>
          )}
          {progress.failures.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-light">{progress.failures.map((f, i) => <li key={i}>{f}</li>)}</ul>
          )}
        </section>
      )}
    </div>
  )
}
