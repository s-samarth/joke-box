/**
 * Recording from the microphone with the browser's MediaRecorder.
 *
 * MediaRecorder hands over the audio in chunks (one a second here), which lets us watch the size
 * and stop before the upload limit. An AnalyserNode reads the loudness for the level meter, so
 * you can see it's hearing you. Stopping releases the mic, so the browser's red dot goes away.
 *
 * Every chunk is also written to the phone as it arrives (inProgress.ts), and the screen is kept
 * awake. If the mic is taken away anyway (the phone locked, a call came in), `onInterrupted`
 * gets what was recorded so far, just as if you had tapped stop.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useWakeLock } from '../../lib/useWakeLock'
import { beginLive, saveChunk } from './inProgress'
import { loudness, smooth } from './loudness'
import { MAX_RECORDING_BYTES, MIC_CONSTRAINTS, avoidedTypes, bitrateFor, pickMimeType } from './voiceMeta'

/** The meter shows the last ~half second as bars scrolling left, newest on the right. */
export const METER_BARS = 7
const METER_STEP_MS = 70
const QUIET: number[] = Array<number>(METER_BARS).fill(0)

export interface Recording {
  /** The note's id, given when recording started; its chunks on the phone are kept under it. */
  id: string
  audio: Blob
  seconds: number
}

interface Live {
  recorder: MediaRecorder
  stream: MediaStream
  context: AudioContext | null
  chunks: Blob[]
  bytes: number
  startedAt: number
  frame: number
  timer: number
  done: Promise<Recording>
}

/** The meter is a nice-to-have: without an AudioContext we still record, just without bars. */
function makeContext(): AudioContext | null {
  try {
    const context = new AudioContext()
    void context.resume()
    return context
  } catch {
    return null
  }
}

interface Handlers {
  onLimit: (r: Recording) => void
  onInterrupted: (r: Recording) => void
}

export function useRecorder(handlers: Handlers) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [levels, setLevels] = useState(QUIET)
  const live = useRef<Live | null>(null)
  const [liveId, setLiveId] = useState<string | null>(null)
  const on = useRef(handlers)
  useEffect(() => { on.current = handlers })
  const screen = useWakeLock(recording)

  const stop = useCallback(async (): Promise<Recording | null> => {
    const current = live.current
    if (!current) return null
    live.current = null
    // Update the screen first, so the tap feels instant; the recorder finishes in the background.
    setRecording(false)
    setLevels(QUIET)
    cancelAnimationFrame(current.frame)
    clearInterval(current.timer)
    if (current.recorder.state !== 'inactive') current.recorder.stop()
    const result = await current.done
    current.stream.getTracks().forEach((t) => t.stop())
    void current.context?.close()
    return result
  }, [])

  const start = useCallback(async (id: string) => {
    if (live.current) return
    // Made before the first await, while we're still inside the tap: browsers (Safari above all)
    // keep an AudioContext created later suspended, and the level meter would sit still.
    const context = makeContext()
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS })
    } catch (e) {
      void context?.close()
      throw e
    }
    const mimeType = pickMimeType((t) => MediaRecorder.isTypeSupported(t), avoidedTypes())
    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: bitrateFor(mimeType) })
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop()) // let go of the mic
      void context?.close()
      throw e
    }
    const chunks: Blob[] = []
    const startedAt = Date.now()
    const type = recorder.mimeType || mimeType || ''
    const done = new Promise<Recording>((resolve) => {
      recorder.onstop = () => resolve({ id, audio: new Blob(chunks, { type }), seconds: Math.round((Date.now() - startedAt) / 1000) })
    })
    const session: Live = { recorder, stream, context: null, chunks, bytes: 0, startedAt, frame: 0, timer: 0, done }
    void beginLive(id, type, startedAt)
    recorder.ondataavailable = (e) => {
      if (!e.data.size) return
      void saveChunk(id, chunks.length, e.data)
      chunks.push(e.data)
      session.bytes += e.data.size
      if (session.bytes > MAX_RECORDING_BYTES && live.current === session) void stop().then((r) => r && on.current.onLimit(r))
    }
    // The mic was taken away: keep what we have, as if stop had been tapped.
    const interrupted = () => {
      if (live.current === session) void stop().then((r) => r && on.current.onInterrupted(r))
    }
    stream.getAudioTracks().forEach((t) => t.addEventListener('ended', interrupted))
    recorder.onerror = interrupted
    recorder.start(1000)
    live.current = session
    setLiveId(id)
    setSeconds(0)
    setRecording(true)
    session.timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 250)
    if (!context) return
    session.context = context // closed by stop()
    // iOS can suspend the context when the mic switches the phone's audio mode; wake it again.
    if (context.state !== 'running') void context.resume()
    try {
      const analyser = context.createAnalyser()
      analyser.fftSize = 1024
      context.createMediaStreamSource(stream).connect(analyser)
      const samples = new Float32Array(analyser.fftSize)
      let current = 0
      let pushedAt = 0
      // Pattern: sample every animation frame, but re-render only every METER_STEP_MS, so the
      // bars move smoothly without React redrawing 60 times a second.
      const tick = (now: number) => {
        analyser.getFloatTimeDomainData(samples)
        current = smooth(current, loudness(samples))
        if (now - pushedAt >= METER_STEP_MS) {
          pushedAt = now
          const level = current
          setLevels((bars) => [...bars.slice(1), level])
        }
        session.frame = requestAnimationFrame(tick)
      }
      session.frame = requestAnimationFrame(tick)
    } catch {
      // no meter
    }
  }, [stop])

  // Leaving the screen: write out the last second now, in case the app doesn't come back. Coming
  // back: if the phone stopped the recorder meanwhile, file what was recorded.
  useEffect(() => {
    const onHide = () => {
      const r = live.current?.recorder
      if (r?.state === 'recording') r.requestData()
    }
    const onVisible = () => {
      const current = live.current
      if (document.visibilityState === 'visible' && current && current.recorder.state === 'inactive') {
        void stop().then((r) => r && on.current.onInterrupted(r))
      }
    }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [stop])

  return { recording, seconds, levels, start, stop, id: recording ? liveId : null, screen }
}
