/**
 * Send an import plan to the server, one item at a time, reporting progress as it goes.
 *
 * It talks to the API directly rather than through the offline save queue: an import is a one-off
 * done on a laptop with a connection, and a failure should show up now, not sync later. One item
 * failing doesn't stop the rest; failures are collected and shown at the end.
 */
import { api } from '../../api/client'
import type { Named, Topic } from '../../api/types'
import { uploadVoiceAudio } from '../../api/voice'
import { blankBit } from '../capture/newBit'
import { topicNames, type ImportPlan } from './bundle'

export interface Progress {
  done: number
  total: number
  failures: string[]
}

interface Context {
  topics: Topic[]
  observationTopics: Named[]
  /** Audio files by name, from the bundle's audio/ folder. */
  audio: Map<string, File>
  onProgress: (p: Progress) => void
}

const AUDIO_TYPES: Record<string, string> = { webm: 'audio/webm', m4a: 'audio/mp4', ogg: 'audio/ogg', opus: 'audio/ogg', mp3: 'audio/mpeg' }

const audioType = (name: string): string => AUDIO_TYPES[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'audio/webm'

const byName = (list: { id: string; name: string }[]) => new Map(list.map((t) => [t.name.toLowerCase(), t.id]))

/** Ids for every topic the plan names, creating the ones that don't exist yet. */
async function ensureTopics(names: string[], known: Map<string, string>, path: string) {
  for (const name of names) {
    if (!known.has(name.toLowerCase())) known.set(name.toLowerCase(), (await api<Named>(path, 'POST', { name })).id)
  }
  return known
}

export async function runImport(plan: ImportPlan, ctx: Context): Promise<Progress> {
  const progress: Progress = { done: 0, total: plan.jokes.length + plan.observations.length + plan.voiceNotes.length, failures: [] }
  const step = async (what: string, work: () => Promise<unknown>) => {
    try {
      await work()
    } catch (e) {
      progress.failures.push(`${what}: ${e instanceof Error ? e.message : String(e)}`)
    }
    progress.done += 1
    ctx.onProgress({ ...progress })
  }

  const thoughts = ctx.topics.find((t) => t.is_system)?.id ?? ''
  const jokeTopics = await ensureTopics(topicNames(plan.jokes), byName(ctx.topics.filter((t) => !t.is_system)), '/api/topics')
  const obsTopics = await ensureTopics(topicNames(plan.observations), byName(ctx.observationTopics), '/api/observation-topics')

  for (const j of plan.jokes) {
    const topicId = (j.topic && jokeTopics.get(j.topic.trim().toLowerCase())) || thoughts
    await step(`Joke "${j.setup.slice(0, 40)}"`, () =>
      api(`/api/bits/${j.id}`, 'PUT', {
        ...blankBit(topicId),
        setup: j.setup,
        punchline: j.punchline ?? '',
        hashtags: j.hashtags ?? [],
        language: j.language ?? null,
        created_at: j.created_at,
      }),
    )
  }
  for (const o of plan.observations) {
    const topicId = (o.topic && obsTopics.get(o.topic.trim().toLowerCase())) || null
    await step(`Observation "${o.text.slice(0, 40)}"`, () =>
      api(`/api/observations/${o.id}`, 'PUT', { text: o.text, topic_id: topicId, created_at: o.created_at }),
    )
  }
  for (const n of plan.voiceNotes) {
    await step(`Voice note "${n.label}"`, async () => {
      const file = ctx.audio.get(n.file)
      if (!file) throw new Error(`audio/${n.file} is missing from the folder`)
      const { label, hashtags, duration_seconds, created_at } = n
      await api(`/api/voice-notes/${n.id}`, 'PUT', { label, hashtags, duration_seconds, created_at })
      // A folder picker types .webm as video; the server takes audio only.
      await uploadVoiceAudio(n.id, new Blob([file], { type: audioType(n.file) }))
    })
  }
  return progress
}
