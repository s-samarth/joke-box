/** The streak cards' colours: green for jokes, gold for the stage, as the rest of the app wears them. */

/** A card's colour, as literal Tailwind classes so they survive the build. */
export interface Tone {
  text: string
  fill: string
  ring: string
  today: string
}

export const TONES = {
  joke: { text: 'text-ok', fill: 'bg-ok', ring: 'ring-ok/30', today: 'ring-1 ring-inset ring-ok/70' },
  stage: { text: 'text-tape', fill: 'bg-tape', ring: 'ring-tape/30', today: 'ring-1 ring-inset ring-tape/70' },
} satisfies Record<string, Tone>
