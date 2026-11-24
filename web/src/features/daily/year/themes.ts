/**
 * The year review's three looks, taken in turn by year so each year feels like its own poster:
 * 2026 a spray-painted brick wall, 2025 a photocopied gig flyer, 2024 a comedy-club marquee, then
 * round again. The backgrounds and poster fonts are in wrapped.css; these are the classes each card
 * piece takes in each look.
 */
export type ThemeKey = 'wall' | 'flyer' | 'marquee'
/** A card's surface: most are `base` or `alt`; the stage card is `stage`. */
export type Tone = 'base' | 'alt' | 'stage'

export interface Theme {
  key: ThemeKey
  surface: Record<Tone, string>
  /** Extra room inside the card (the marquee's bulbs need it). */
  inset: string
  /** The small line over a headline. */
  eyebrow: string
  /** Big headline words and numbers. */
  display: string
  /** A highlighted word or number. */
  accent: string
  /** A boxed stat. */
  box: string
  /** Chart bars: the plain ones and the record one. */
  bar: string
  barTop: string
  /** A muted line. */
  muted: string
}

const THEMES: Theme[] = [
  {
    key: 'wall',
    surface: { base: 'wrap-wall', alt: 'wrap-wall', stage: 'bg-tape text-tape-ink' },
    inset: 'px-5',
    eyebrow: 'font-marker text-[15px] -rotate-2 opacity-80',
    display: 'font-poster',
    accent: 'text-tape',
    box: 'rounded-lg border-2 border-current/80',
    bar: 'bg-[#3a4157]',
    barTop: 'bg-ok',
    muted: 'opacity-70',
  },
  {
    key: 'flyer',
    surface: { base: 'wrap-flyer', alt: 'wrap-flyer', stage: 'wrap-flyer-dark' },
    inset: 'px-5',
    eyebrow: 'font-poster text-[12px] tracking-wide',
    display: 'font-poster-shade',
    accent: 'text-[#d8322a]',
    box: 'border-2 border-current',
    bar: 'bg-current/25',
    barTop: 'bg-current',
    muted: 'opacity-75',
  },
  {
    key: 'marquee',
    surface: { base: 'wrap-marquee', alt: 'wrap-marquee', stage: 'wrap-marquee' },
    inset: 'px-7',
    eyebrow: 'font-poster text-[12px] text-[#ffd66b]',
    display: 'font-poster text-[#ffd66b]',
    accent: 'text-[#ff6b9a] neon',
    box: 'rounded-md border-2 border-[#ffd66b]',
    bar: 'bg-[#ffd66b]/25',
    barTop: 'bg-[#ffd66b]',
    muted: 'opacity-75',
  },
]

/** A colour class for a word on the card, or none on the flyer's light paper, where it would wash out. */
export const tint = (t: Theme, cls: string): string => (t.key === 'flyer' ? '' : cls)

/** 2026 is the wall, 2025 the flyer, 2024 the marquee, and on round. */
export const themeFor = (year: number): Theme => THEMES[(((2026 - year) % 3) + 3) % 3]
