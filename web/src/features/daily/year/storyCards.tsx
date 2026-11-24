/**
 * A year's cards, in order, each dressed in the year's look (themes.ts): the cover, the best
 * month, the biggest day, the longest streak, the top topic, when you write, the year on stage
 * and how far the ideas got. A card with nothing to say (no shows, no streak) is left out.
 */
import type { ReactNode } from 'react'
import { CoverCard } from './CoverCard'
import { StageCard, ThroughCard } from './StageCards'
import type { Theme, Tone } from './themes'
import { DayCard, MonthCard, StreakCard, TopicCard, WhenCard } from './WritingCards'
import type { YearStats } from './yearStats'

export interface Story {
  key: string
  tone: Tone
  body: ReactNode
}

export function storiesFor(s: YearStats, t: Theme): Story[] {
  const all: (Story | false)[] = [
    { key: 'cover', tone: 'base', body: <CoverCard t={t} s={s} /> },
    Boolean(s.best) && { key: 'month', tone: 'alt', body: <MonthCard t={t} s={s} /> },
    Boolean(s.biggest) && { key: 'day', tone: 'base', body: <DayCard t={t} s={s} /> },
    Boolean(s.streak && s.streak.length > 1) && { key: 'streak', tone: 'alt', body: <StreakCard t={t} s={s} /> },
    s.topics.length > 0 && { key: 'topic', tone: 'base', body: <TopicCard t={t} s={s} /> },
    Boolean(s.rhythm) && { key: 'when', tone: 'alt', body: <WhenCard t={t} s={s} /> },
    Boolean(s.stage) && { key: 'stage', tone: 'stage', body: <StageCard t={t} s={s} /> },
    { key: 'through', tone: 'base', body: <ThroughCard t={t} s={s} /> },
  ]
  return all.filter((x): x is Story => Boolean(x))
}
