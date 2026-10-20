/**
 * Play one note. Only one plays at a time: starting another pauses the current one.
 *
 * The audio is fetched as a Blob (see audioCache) rather than pointing <audio> at the API URL.
 * Safari only streams media from servers that answer byte-range requests; playing from memory
 * sidesteps that, keeps the sign-in cookie on the request, and works offline once cached.
 */
import { useEffect, useRef, useState } from 'react'
import { audioUrl } from './audioCache'

let playing: HTMLAudioElement | null = null

export function usePlayer(id: string, knownSeconds: number) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle')
  const [position, setPosition] = useState(0)
  const [problem, setProblem] = useState<string | null>(null)
  // Some recordings (WebM from Chrome) don't state their length, so fall back to what we saved.
  const [mediaSeconds, setMediaSeconds] = useState(0)

  useEffect(() => () => { audio.current?.pause() }, [])

  const load = async (): Promise<HTMLAudioElement> => {
    if (audio.current) return audio.current
    const el = new Audio(await audioUrl(id))
    el.ontimeupdate = () => setPosition(el.currentTime)
    el.onloadedmetadata = () => { if (Number.isFinite(el.duration)) setMediaSeconds(el.duration) }
    el.onplay = () => setState('playing')
    el.onpause = () => setState('paused')
    el.onended = () => { setState('idle'); setPosition(0) }
    audio.current = el
    return el
  }

  const toggle = async () => {
    setProblem(null)
    if (state === 'playing') return audio.current?.pause()
    setState((s) => (s === 'idle' ? 'loading' : s))
    try {
      const el = await load()
      if (playing && playing !== el) playing.pause()
      playing = el
      await el.play()
    } catch {
      setState('idle')
      setProblem(navigator.onLine ? "Couldn't play this note." : 'Not on this phone yet. Play it once online and it stays available offline.')
    }
  }

  const seek = (seconds: number) => {
    if (!audio.current) return
    audio.current.currentTime = seconds
    setPosition(seconds)
  }

  const duration = mediaSeconds > 0 ? mediaSeconds : knownSeconds
  return { state, position, duration, problem, toggle, seek }
}
