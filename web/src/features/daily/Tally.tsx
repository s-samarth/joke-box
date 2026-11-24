/**
 * A count of shows as tally marks, the way a comic keeps count in a notebook: four strokes and a
 * fifth across them, in gold. Past `max` marks it stops drawing and the number beside it says it.
 */
const GROUP = 22
const STROKE = 4

export function Tally({ count, height = 16, max = 20, className = '', color = 'text-tape', style }: { count: number; height?: number; max?: number; className?: string; color?: string; style?: React.CSSProperties }) {
  const n = Math.min(count, max)
  if (n <= 0) return null
  const lines: [number, number, number, number][] = []
  for (let g = 0; g * 5 < n; g++) {
    const x = g * GROUP
    const inGroup = Math.min(5, n - g * 5)
    for (let i = 0; i < Math.min(inGroup, 4); i++) lines.push([x + i * STROKE + 1, 1, x + i * STROKE + 1, height - 1])
    if (inGroup === 5) lines.push([x - 1, height - 3, x + 15, 3])
  }
  const width = Math.ceil(n / 5) * GROUP - (n % 5 === 0 ? 6 : GROUP - (n % 5) * STROKE)
  return (
    <svg aria-hidden width={Math.max(width, 3)} height={height} viewBox={`0 0 ${Math.max(width, 3)} ${height}`} className={`shrink-0 ${color} ${className}`} style={style} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      {lines.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
    </svg>
  )
}
