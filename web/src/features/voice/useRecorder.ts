/**
 * Recording from the microphone with the browser's MediaRecorder.
 *
 * MediaRecorder hands over the audio in chunks (one a second here), which lets us watch the size
 * and stop before the upload limit. An AnalyserNode reads the loudness for the level meter, so
 * you can see it's hearing you. Stopping releases the mic, so the browser's red dot goes away.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_RECORDING_BYTES, VOICE_BITRATE, baseType, pickMimeType } from './voiceMeta'

export interface Recording {
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

/*
 * Formats that produced an empty recording in this browser. Some browsers say they can record
 * MP4 and then hand back nothing; we remember that and use the next format from then on.
 */
const AVOID_KEY = 'jokebox.voice.avoidTypes'

function avoidedTypes(): string[] {
  try {
    return JSON.parse(localStorage.getItem(AVOID_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

export function avoidType(type: string): void {
  try {
    localStorage.setItem(AVOID_KEY, JSON.stringify([...new Set([...avoidedTypes(), baseType(type)])]))
  } catch {
    // storage blocked: we'll just try the same format again
  }
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

export function useRecorder({ onLimit }: { onLimit: (r: Recording) => void }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [level, setLevel] = useState(0)
  const live = useRef<Live | null>(null)
  const limitRef = useRef(onLimit)
  useEffect(() => { limitRef.current = onLimit })

  const stop = useCallback(async (): Promise<Recording | null> => {
    const current = live.current
    if (!current) return null
    live.current = null
    // Update the screen first, so the tap feels instant; the recorder finishes in the background.
    setRecording(false)
    setLevel(0)
    cancelAnimationFrame(current.frame)
    clearInterval(current.timer)
    if (current.recorder.state !== 'inactive') current.recorder.stop()
    const result = await current.done
    current.stream.getTracks().forEach((t) => t.stop())
    void current.context?.close()
    return result
  }, [])

  const start = useCallback(async () => {
    if (live.current) return
    // Made before the first await, while we're still inside the tap: browsers (Safari above all)
    // keep an AudioContext created later suspended, and the level meter would sit still.
    const context = makeContext()
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch (e) {
      void context?.close()
      throw e
    }
    const mimeType = pickMimeType((t) => MediaRecorder.isTypeSupported(t), avoidedTypes())
    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: VOICE_BITRATE })
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop()) // let go of the mic
      void context?.close()
      throw e
    }
    const chunks: Blob[] = []
    const startedAt = Date.now()
    const done = new Promise<Recording>((resolve) => {
      recorder.onstop = () => resolve({ audio: new Blob(chunks, { type: recorder.mimeType || mimeType }), seconds: Math.round((Date.now() - startedAt) / 1000) })
    })
    const session: Live = { recorder, stream, context: null, chunks, bytes: 0, startedAt, frame: 0, timer: 0, done }
    recorder.ondataavailable = (e) => {
      if (!e.data.size) return
      chunks.push(e.data)
      session.bytes += e.data.size
      if (session.bytes > MAX_RECORDING_BYTES && live.current === session) void stop().then((r) => r && limitRef.current(r))
    }
    recorder.start(1000)
    live.current = session
    setSeconds(0)
    setRecording(true)
    session.timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 250)
    if (!context) return
    session.context = context // closed by stop()
    try {
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      context.createMediaStreamSource(stream).connect(analyser)
      const samples = new Uint8Array(analyser.fftSize)
      const tick = () => {
        analyser.getByteTimeDomainData(samples)
        let sum = 0
        for (const s of samples) sum += ((s - 128) / 128) ** 2
        setLevel(Math.min(1, Math.sqrt(sum / samples.length) * 4))
        session.frame = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      // no meter
    }
  }, [stop])

  return { recording, seconds, level, start, stop }
}
