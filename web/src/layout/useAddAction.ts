/**
 * What the + button does depends on where you are: on Premises it writes a premise, on Shows it
 * logs a show, on Observations it jumps to the box. Anywhere else (or if unsure) it's a new joke.
 * Pattern: a page opens its sheet from a URL flag (?new=1, ?log=1), so the button needs no
 * knowledge of the page's state, and a link can open the same sheet.
 */
import { useLocation, useNavigate } from 'react-router'
import { useCapture } from '../features/capture/captureContext'

export function useAddAction(): { label: string; run: () => void } {
  const { openCapture } = useCapture()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const on = (section: string) => pathname === section || pathname.startsWith(`${section}/`)
  const withFlag = (path: string, flag: string) => {
    const params = new URLSearchParams(search)
    params.set(flag, '1')
    navigate(`${path}?${params}`, { replace: true })
  }

  if (on('/premises')) return { label: 'New premise', run: () => withFlag(pathname, 'new') }
  if (on('/shows')) return { label: 'Log a show', run: () => withFlag('/shows', 'log') }
  if (on('/observations')) {
    return { label: 'New observation', run: () => document.getElementById('observation-text')?.focus() }
  }
  return { label: 'New joke', run: () => openCapture() }
}
