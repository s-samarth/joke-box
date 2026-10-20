/**
 * /setlist shows your saved sets (or a blank one if you have none); /setlist/:id is the builder.
 * A new set gets its id up front, so "New setlist" is just a link to /setlist/<fresh id>.
 */
import { Navigate, useParams } from 'react-router'
import { newId } from '../../api/client'
import { useSetlists } from '../../api/shows'
import { Spinner } from '../../components/ui/bits'
import { SavedSetlists } from './SavedSetlists'
import { SetlistBuilder } from './SetlistBuilder'

export function SetlistPage() {
  const { setlistId } = useParams()
  const { data: setlists, isPending } = useSetlists()

  if (isPending && !setlists) {
    return <div className="py-24"><Spinner /></div>
  }
  if (!setlistId) {
    if (!setlists?.length) return <Navigate to={`/setlist/${newId()}`} replace />
    return <SavedSetlists setlists={setlists} />
  }
  const existing = setlists?.find((s) => s.id === setlistId)
  return <SetlistBuilder key={setlistId} id={setlistId} existing={existing} />
}
