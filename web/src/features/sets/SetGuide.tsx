/**
 * "How sets work": the note in the Sets tab on what every part of a set means and how to use
 * it. The longer version, with why each choice was made, is docs/sets.md: keep the two together.
 */
import type { ReactNode } from 'react'
import { Modal } from '../../components/ui/Modal'

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-rule pt-4">
      <h3 className="font-semibold text-paper">{title}</h3>
      <div className="mt-1.5 space-y-2 text-[15px] leading-relaxed text-dim">{children}</div>
    </section>
  )
}

const Swatch = ({ className, children }: { className: string; children: ReactNode }) => <b className={className}>{children}</b>

export function SetGuide({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} wide title="How sets work" description="A set is the case you make, not a script. You memorise its shape, and the jokes hang off it.">
      <div className="space-y-4">
        <Part title="The point">One sentence: what the room should think by the end. Every beat serves it.</Part>
        <Part title="Status">Where the set stands: Draft (every set starts there), Work in Progress, Stage Ready or Discarded. Sets filters by it, and All leaves Discarded out.</Part>
        <Part title="Beats, in a fixed order">
          <p>The spine of the set. Each beat has a <b className="text-paper">cue</b> (the one word you remember on stage), its own <b className="text-paper">time</b> and a line on what it's for.</p>
          <p>You set a beat's time by hand. Joke times don't add up to it, because on stage a joke runs longer than on paper. The set's length is the beats' times added up.</p>
          <p>Beats never branch: they always run in this order. Anything that depends on the room lives inside a beat.</p>
        </Part>
        <Part title="Inside a beat">
          <p>One ordered list of:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><Swatch className="text-leaf">Premises</Swatch> (green), the take a run of jokes rests on, with those jokes under them.</li>
            <li><b className="text-paper">Jokes with no premise</b>, as many blocks as you like, before, between or after premises. Tap Select some for a premise to put them under one later.</li>
            <li><Swatch className="text-orchid">Crowd work</Swatch> (pink): questions for the room, and lines for what they might say. Mark each question Have a reply or No reply yet.</li>
          </ul>
        </Part>
        <Part title="Locked, loose and gates">
          <p><Swatch className="text-tape">Locked</Swatch> (yellow): done in this place. <Swatch className="text-teal">Loose</Swatch> (teal): it keeps its number, but you can move it or drop it on the night.</p>
          <p>A <Swatch className="text-sky">gate</Swatch> (blue) is a box: a joke on top, and the jokes you do only if it lands inside. If it doesn't land, you skip the box. Tap Gate on a joke and the joke under it goes in; drag more in or out, or tap + Joke in this gate. Tap Gate again to open the box: its jokes stay where they are.</p>
          <p>A gate can hold one gate of its own. Jokes inside that one can't be gates: two levels at most.</p>
          <p>A premise after the first can be gated too: do it only if the premise before it landed.</p>
        </Part>
        <Part title="Moving things">
          <p>Drag by the grip (⋮⋮) on a beat, a block or a joke. Anywhere else, a finger still scrolls. On a phone or iPad, hold the grip a moment first. With a keyboard: Tab to the grip, Space, the arrow keys, Space.</p>
          <p>Beats move in the spine. Blocks move within their beat, and fold to their headings while you drag one. Jokes move within a block, into and out of gates, and into another block in the beat. A gate's joke brings its whole box.</p>
          <p>Or tap Move on a joke. It has two parts. No premise: New block, just below (its own block, out of any premise), or into another No premise block. Under a premise: into another premise in the beat, or pick any premise.</p>
          <p>The arrows move a thing one place, walking into and out of gates on the way. They don't leave the block: drag or Move for that.</p>
        </Part>
        <Part title="Premises and your library">Sets never change your library. Adding a joke under a premise here, dragging or moving it into one, or taking it out changes only the set: in your library each joke keeps the premise it rests on, or none. Link a joke to a premise on the joke itself.</Part>
        <Part title="Clusters">A cluster shows once when you add jokes, and adds its lead. A version from a cluster plays the cluster's lead, so changing the lead in Jokes changes the set. Pick another version to pin that one in this set whatever the lead is.</Part>
        <Part title="Labels">
          <p>Each beat gets labels in this set, not on the jokes, because the same joke can play a different status somewhere else. The fields start as Status, Dominant persona side, Tone and Voice fit. Not sure is always there.</p>
          <p>Tap <b className="text-paper">Edit labels</b> to add, rename, recolour or delete options and fields (tap an option's dot for its colour). Deleting one tells you how many beats have it first, and they turn to Not sure.</p>
          <p>Each joke and premise has its own <b className="text-paper">Vibe</b> (Riled up, Bakchod or Point prover, the sides of Dominant persona side) and <b className="text-paper">Generic</b> or Non-generic. Set them right in the set, beside Locked and Gate, or on the joke's or premise's page. Vibes wear colours (Riled up red, Bakchod blue, Point prover green, Not sure orange), Generic is red and Non-generic green, and Generic shows in amber until you answer it.</p>
          <p>Status options count as a win, neutral (System attack: you and the room against the system together) or a loss. A loss is a humility top-up.</p>
        </Part>
        <Part title="The checks">
          <p>Each check is a rule from your Craft notes, counted from your own labels. None of them judges a joke.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>A status shift needs a reason: Top-up, Planned turn or Clash. It applies once two beats have a status, because one beat can't shift.</li>
            <li>A humility top-up at least every 4:00 (your limit). It applies once the set is longer than the limit, because a shorter set can't go that long without one. Neutral isn't a top-up.</li>
            <li>Every persona side drives a beat. It applies once there's a beat for each side.</li>
          </ul>
          <p>Until a check applies, it's greyed out and says what it needs: <b className="text-paper">Needs more beats</b> or <b className="text-paper">Needs labels</b>. It never ticks a rule it can't test yet.</p>
          <p>Not sure is never guessed. The top-up check warns only if the stretch is too long even with every Not sure beat as a top-up, and ticks only if it's fine with none of them as one. In between, it names the beats to label.</p>
        </Part>
        <Part title="On stage and the cue card">
          <p><b className="text-paper">On stage</b> walks the set one beat at a time. Answer each gate as you reach it, and what it guards is struck out if it didn't land. Next always means the next beat.</p>
          <p>The <b className="text-paper">cue card</b> is what you memorise: the beat cues and times, with each beat's premises under them. Print it or keep it on your phone.</p>
        </Part>
      </div>
    </Modal>
  )
}
