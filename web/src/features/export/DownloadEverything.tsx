/**
 * "Download everything", from the account menu: reads every area from the server, builds one
 * ZIP on this device, then offers it to save. Two taps, because a phone only opens its share
 * sheet in answer to a tap, and building the file takes longer than a tap lasts.
 */
import { Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ApiError, api } from '../../api/client'
import { NetworkError } from '../../api/network'
import { downloadVoiceAudio } from '../../api/voice'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useWaiting } from '../../layout/useWaiting'
import { collect, type Archive, type Progress, type Sources } from './collect'
import { saveFile } from './saveFile'

const live: Sources = { json: (path) => api<unknown>(path), audio: downloadVoiceAudio }

type State =
  | { stage: 'idle' }
  | { stage: 'working'; progress: Progress }
  | { stage: 'ready'; archive: Archive }
  | { stage: 'failed'; message: string }

const size = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`)

function failureMessage(e: unknown): string {
  if (e instanceof NetworkError) return 'You’re offline, or the signal dropped part-way. Nothing was saved. Try again with a steady connection.'
  if (e instanceof ApiError && e.status === 401) return 'You’ve been signed out. Sign in again, then try again.'
  if (e instanceof Error && e.message) return `Couldn’t finish: ${e.message}. Nothing was saved. Try again.`
  return 'Couldn’t finish. Nothing was saved. Try again.'
}

export function DownloadEverything({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [state, setState] = useState<State>({ stage: 'idle' })
  const running = useRef<AbortController | null>(null)
  const { count: waiting } = useWaiting()

  // Closing the sheet stops a download part-way and forgets a finished file.
  const change = (next: boolean) => {
    if (!next) {
      running.current?.abort()
      running.current = null
      setState({ stage: 'idle' })
    }
    onOpenChange(next)
  }
  useEffect(() => () => running.current?.abort(), []) // and so does leaving the page

  const start = async () => {
    const controller = new AbortController()
    running.current = controller
    setState({ stage: 'working', progress: { done: 0, total: 1, step: 'Starting' } })
    try {
      const archive = await collect(live, (progress) => {
        if (!controller.signal.aborted) setState({ stage: 'working', progress })
      }, controller.signal)
      if (!controller.signal.aborted) setState({ stage: 'ready', archive })
    } catch (e) {
      if (!controller.signal.aborted) setState({ stage: 'failed', message: failureMessage(e) })
    }
  }

  const description = 'Every joke, premise, set, show, observation, brainstorm, Craft note, analysis and voice recording, in one ZIP file.'
  return (
    <Modal open={open} onOpenChange={change} title="Download everything" description={description}>
      <div className="space-y-4 text-sm">
        {waiting > 0 && (
          <p className="rounded-lg bg-ink-3 px-3 py-2 text-dim">
            {waiting === 1 ? '1 change on this device hasn’t' : `${waiting} changes on this device haven’t`} synced yet, so
            {waiting === 1 ? ' it won’t be' : ' they won’t be'} in the file.
          </p>
        )}
        {state.stage === 'idle' && (
          <>
            <p className="text-dim">It’s made on this device from what’s on the server. Big libraries with lots of recordings take a minute.</p>
            <Button variant="tape" icon={<Download size={16} />} onClick={() => void start()}>Make the file</Button>
          </>
        )}
        {state.stage === 'working' && (
          <div aria-live="polite">
            <p className="mb-2">{state.progress.step}…</p>
            <div className="h-2 overflow-hidden rounded-full bg-ink-3" role="progressbar" aria-valuemin={0} aria-valuemax={state.progress.total} aria-valuenow={state.progress.done}>
              <div className="h-full bg-tape transition-[width]" style={{ width: `${(100 * state.progress.done) / Math.max(state.progress.total, 1)}%` }} />
            </div>
            <Button variant="quiet" className="mt-3" onClick={() => change(false)}>Cancel</Button>
          </div>
        )}
        {state.stage === 'ready' && (
          <>
            <p>Ready: {state.archive.files} files, {size(state.archive.file.size)}.</p>
            {state.archive.missing.length > 0 && (
              <p className="text-light">
                {state.archive.missing.length === 1 ? '1 recording' : `${state.archive.missing.length} recordings`} couldn’t be downloaded.
                README.txt in the file lists {state.archive.missing.length === 1 ? 'it' : 'them'}; everything else is there.
              </p>
            )}
            <Button variant="tape" icon={<Download size={16} />} onClick={() => void saveFile(state.archive.file, state.archive.name)}>
              Save the file
            </Button>
          </>
        )}
        {state.stage === 'failed' && (
          <>
            <p className="text-light" role="alert">{state.message}</p>
            <Button onClick={() => void start()}>Try again</Button>
          </>
        )}
      </div>
    </Modal>
  )
}
