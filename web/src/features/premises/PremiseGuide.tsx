/**
 * What a premise should have, in a few lines, with links to the Craft notes that go deeper. The
 * notes are found by title in your own Craft, so a renamed or missing note just loses its link.
 */
import { Link } from 'react-router'
import { useCraftNotes } from '../../api/craft'

const NOTES = ['How a joke works', "What's a faulty premise?"]

export function PremiseGuide() {
  const { data: notes = [] } = useCraftNotes()
  const links = NOTES.flatMap((title) => {
    const note = notes.find((n) => n.title.trim().toLowerCase() === title.toLowerCase())
    return note ? [{ id: note.id, title: note.title }] : []
  })
  return (
    <div className="rounded-xl bg-ink-3/60 p-4 text-sm leading-relaxed text-dim">
      <p>
        A premise is <span className="text-paper">what you think</span>; the setups are what you say. Write your take as one plain line,
        then the reason in the notes: <span className="text-paper">X is Y, because Z</span>.
      </p>
      <p className="mt-2">
        A stranger should say "huh, never thought of it that way", not "obviously" (not insightful) or "that's not true" (not logical).
      </p>
      {links.length > 0 && (
        <p className="mt-2">
          In Craft:{' '}
          {links.map((l, i) => (
            <span key={l.id}>{i > 0 && ' · '}<Link to={`/craft/${l.id}`} className="text-tape hover:underline">{l.title}</Link></span>
          ))}
        </p>
      )}
    </div>
  )
}
