/** On a joke's page: how it has gone at the shows you logged it at, if any. */
import { Mic } from 'lucide-react'
import { useLogs } from '../../api/shows'
import { formatDate } from '../../lib/time'
import { recordLine, showRecord } from '../shows/showJokes'

export function JokeShowRecord({ jokeId }: { jokeId: string }) {
  const { data: logs = [] } = useLogs()
  const record = showRecord(logs, jokeId)
  if (!record.shows) return null
  return (
    <p className="mt-10 flex items-center gap-2 text-[15px] text-dim">
      <Mic size={16} className="shrink-0 text-faint" />
      <span>{recordLine(record)}{record.last ? `. Last done ${formatDate(record.last)}` : ''}.</span>
    </p>
  )
}
