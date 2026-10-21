/**
 * Chart colours for the dark app surface, checked with the dataviz palette validator against
 * ink-2 (#1b2030). Ratings are ordered, so they get one gold hue from dim (1 star) to bright
 * (5 stars). Better or worse than your usual are two opposite hues, gold and blue, at the same
 * lightness so neither side shouts louder; a grey hairline marks "your usual" between them.
 */
export const RATING_COLORS = ['#5c5232', '#857337', '#ad963e', '#d4b648', '#f0cf5a']

export const ABOVE = '#ad922c'
export const BELOW = '#6a7fd4'

/** The colour for a (possibly averaged) rating from 1 to 5. */
export const ratingColor = (rating: number): string => RATING_COLORS[Math.min(4, Math.max(0, Math.round(rating) - 1))]

/** "+0.4", "−0.2", or "0.0" when it rounds to nothing (never "−0.0"). */
export function signed(n: number): string {
  const text = Math.abs(n).toFixed(1)
  return text === '0.0' ? text : `${n > 0 ? '+' : '−'}${text}`
}
