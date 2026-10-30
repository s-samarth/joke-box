/**
 * How to write a premise: what it is, how one premise feeds many setups, and the three checks,
 * each with a made-up example. Folds away once you know it. Links to the Craft notes that go
 * deeper are found by title in your own Craft, so a renamed or missing note just loses its link.
 */
import { Link } from 'react-router'
import { useCraftNotes } from '../../api/craft'
import type { ReactNode } from 'react'

const NOTES = ['How a joke works', "What's a faulty premise?", 'Elements of a good setup']

/** One premise and the setups it gives, each planting a different assumption. */
const EXAMPLE = {
  premise: 'A wedding is a project the couple doesn’t run, because both families are paying for it.',
  setups: ['“We wanted a small wedding.”', '“My fiancée picked the date.”', '“The caterer asked what we’d like to eat.”', '“We wrote our own vows.”'],
}

/** A premise that fails a check, and one that passes. */
const CHECKS: { check: string; why: string; weak: string; strong: string }[] = [
  {
    check: 'It has a because',
    why: 'A topic with a mood is a complaint, not a premise. The reason is what gives every joke a direction.',
    weak: 'Gyms are annoying.',
    strong: 'A gym membership is a fee for feeling fit, because you pay the most in the months you never go.',
  },
  {
    check: 'It says something new',
    why: 'If the room agreed before you started, there’s nothing to see. Aim for “huh, never thought of it like that”.',
    weak: 'Phones are addictive.',
    strong: 'Your phone is the only friend who’s always free, because it has nowhere else to be.',
  },
  {
    check: 'It’s true',
    why: 'Exaggerate later, in the jokes. If they think “that’s not true”, they stop following you.',
    weak: 'Fridges get lonely when you travel.',
    strong: 'A fridge is a diary of your week, because what’s left in it is everything you gave up on.',
  },
]

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4 first:mt-0">
      <h4 className="font-medium text-paper">{title}</h4>
      <div className="mt-1 space-y-2">{children}</div>
    </section>
  )
}

export function PremiseGuide({ open = false }: { open?: boolean }) {
  const { data: notes = [] } = useCraftNotes()
  const links = NOTES.flatMap((title) => {
    const note = notes.find((n) => n.title.trim().toLowerCase() === title.toLowerCase())
    return note ? [{ id: note.id, title: note.title }] : []
  })
  return (
    <details open={open} className="group rounded-xl bg-ink-3/60 text-sm leading-relaxed text-dim">
      <summary className="cursor-pointer px-4 py-3 text-paper select-none">How to write a good premise</summary>
      <div className="px-4 pb-4">
        <Part title="What it is">
          <p>
            A premise is <span className="text-paper">your take on a topic, with a reason</span>: X is Y, because Z. It’s what you think.
            A setup is what you say: the plain line before the punch that makes the room assume something. You often never say the
            premise on stage. It sits under the jokes and keeps them pointing the same way.
          </p>
          <p>
            Topic: <span className="text-paper">weddings</span>. Premise: <span className="text-paper">{EXAMPLE.premise}</span> Setup:{' '}
            <span className="text-paper">{EXAMPLE.setups[0]}</span>
          </p>
        </Part>
        <Part title="One premise, many setups">
          <p>Each setup plants a different assumption, and every punch reveals the same truth underneath. From the wedding premise:</p>
          <ul className="list-disc space-y-0.5 pl-5 text-paper">{EXAMPLE.setups.map((s) => <li key={s}>{s}</li>)}</ul>
          <p>
            One setup makes a joke. Five or more make a bit. To find the next one, ask: <span className="text-paper">if this is true, what else is true?</span>
          </p>
        </Part>
        <Part title="Three checks">
          {CHECKS.map((c) => (
            <div key={c.check}>
              <p><span className="text-paper">{c.check}.</span> {c.why}</p>
              <p className="mt-0.5">Weak: {c.weak} <span className="text-paper">Better: {c.strong}</span></p>
            </div>
          ))}
        </Part>
        <Part title="Writing it here">
          <p>
            Put the take in one plain sentence at the top. Put the because, and anything you’re still unsure of, in <span className="text-paper">Why it’s true</span>.
            Then write jokes on it, or add ones you’ve written, from any topic.
          </p>
        </Part>
        {links.length > 0 && (
          <p className="mt-4">
            More in Craft:{' '}
            {links.map((l, i) => (
              <span key={l.id}>{i > 0 && ' · '}<Link to={`/craft/${l.id}`} className="text-tape hover:underline">{l.title}</Link></span>
            ))}
          </p>
        )}
      </div>
    </details>
  )
}
