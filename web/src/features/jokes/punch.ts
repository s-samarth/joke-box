/**
 * Using an alternate punch: it becomes the punchline and the punchline it replaced takes its
 * row, so nothing is lost and doing it again swaps them back. With no punchline yet, the
 * alternate just moves up and its row goes.
 */
export function swapPunch(punchline: string, alternates: string[], i: number): { punchline: string; alt_punchlines: string[] } {
  const rest = punchline.trim() ? alternates.map((a, n) => (n === i ? punchline : a)) : alternates.filter((_, n) => n !== i)
  return { punchline: alternates[i], alt_punchlines: rest }
}
