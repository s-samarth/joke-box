/**
 * Shown in a session whose writing now goes to a copy: it was changed on another device while
 * this one was editing, so both versions are kept (see api/sessionClash.ts).
 */
import { Link } from 'react-router'
import { useMovedTo } from '../../api/sessionClash'

export function MovedNotice({ id, version }: { id: string; version: number | undefined }) {
  const copy = useMovedTo(id, version)
  if (!copy) return null
  return (
    <p role="status" className="border-t border-rule px-3 py-2 text-sm text-paper sm:px-6">
      This session was changed on another device, so what you write here is kept in a copy.{' '}
      <Link to={`/brainstorm/${copy}`} className="text-tape underline">Open the copy</Link>
    </p>
  )
}
