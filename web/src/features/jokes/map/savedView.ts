/**
 * Map or Web, whichever you used last on this device. The map beside the list on a wide screen
 * opens on it. A device that last used the old Board opens on the Map.
 */
export type JokeView = 'map' | 'web'

const KEY = 'jokebox.jokeView'

export function savedView(): JokeView {
  try {
    return localStorage.getItem(KEY) === 'web' ? 'web' : 'map'
  } catch {
    return 'map'
  }
}

export function saveView(view: JokeView): void {
  try {
    localStorage.setItem(KEY, view)
  } catch {
    // Private mode: it just won't be remembered.
  }
}
