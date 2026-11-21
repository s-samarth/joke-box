/**
 * A short confetti burst over the whole screen: pieces fly up from both bottom corners, tumble and
 * fade over three seconds, then the canvas removes itself. It never takes a tap (the page
 * underneath keeps working), and it does nothing when the phone asks for reduced motion.
 * Hand-written so the app needs no confetti package.
 */
interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  turn: number
  spin: number
  w: number
  h: number
  color: string
}

const PIECES = 160
const DURATION = 3000 // ms, whatever the frame rate (a phone in Low Power Mode draws fewer)
const FRAME = 1000 / 60 // the physics below is per 60th of a second
const GRAVITY = 0.25
const DRAG = 0.985

function launch(width: number, height: number, colors: string[]): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => {
    const left = i % 2 === 0
    return {
      x: left ? 0 : width,
      y: height * 0.8,
      vx: (left ? 1 : -1) * (3 + Math.random() * (width / 90)),
      vy: -(8 + Math.random() * (height / 70)),
      turn: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      w: 6 + Math.random() * 5,
      h: 9 + Math.random() * 7,
      color: colors[i % colors.length],
    }
  })
}

export function confetti(colors: string[]): void {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const [width, height, ratio] = [window.innerWidth, window.innerHeight, window.devicePixelRatio || 1]
  canvas.width = width * ratio
  canvas.height = height * ratio
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '80' })
  document.body.appendChild(canvas)
  ctx.scale(ratio, ratio)

  const pieces = launch(width, height, colors)
  let started: number | null = null
  let last = 0
  const draw = (now: number) => {
    started ??= now
    const elapsed = now - started
    // How many 60ths of a second passed since the last frame, capped so a stall doesn't teleport pieces.
    const steps = Math.min(4, last ? (now - last) / FRAME : 1)
    last = now
    ctx.clearRect(0, 0, width, height)
    ctx.globalAlpha = Math.max(0, 1 - elapsed / DURATION)
    for (const p of pieces) {
      p.vy += GRAVITY * steps
      p.vx *= DRAG ** steps
      p.x += p.vx * steps
      p.y += p.vy * steps
      p.turn += p.spin * steps
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.turn)
      ctx.fillStyle = p.color
      // Squashing the height as it turns makes each piece look like it's flipping.
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(elapsed / 110 + p.turn)))
      ctx.restore()
    }
    if (elapsed < DURATION) requestAnimationFrame(draw)
    else canvas.remove()
  }
  requestAnimationFrame(draw)
}
