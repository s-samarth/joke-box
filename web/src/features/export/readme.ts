/** README.txt at the top of a "Download everything" archive: what's in it and how to read it. */

const count = (value: unknown) => (Array.isArray(value) ? value.length : 0)
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`

/** The README for these lists, made at `now`, noting any recordings that couldn't be fetched. */
export function readme(lists: Record<string, unknown>, now: Date, missing: string[]): string {
  const n = (file: string, one: string, many?: string) => plural(count(lists[file]), one, many)
  const recordings = (lists['voice-notes.json'] as { has_audio?: boolean }[] | undefined) ?? []
  const lines = [
    'JokeBox: everything, downloaded ' + now.toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
    '',
    `${n('jokes.json', 'joke')}, ${n('premises.json', 'premise')}, ${n('sets.json', 'set')}, ${n('shows.json', 'show')},`,
    `${n('observations.json', 'observation')}, ${n('brainstorm-sessions.json', 'brainstorm session')}, ${n('rewrites.json', 'rewrite')},`,
    `${n('craft-notes.json', 'Craft note')}, ${n('watchlist.json', 'watchlist item')}, ${n('analyses.json', 'analysis', 'analyses')},`,
    `${n('voice-notes.json', 'voice note')} (${recordings.filter((r) => r.has_audio).length} with a recording).`,
    '',
    'What the files are',
    '- Each .json file is one list, exactly as the JokeBox API sends it (see docs/api.md and',
    '  docs/data-model.md in the JokeBox repository for every field). Ids link them: a joke\'s',
    '  premise_id is a premise\'s id, a set\'s items name joke ids, and so on.',
    '- brainstorm-sessions.json lists the sessions; brainstorm-sessions/ holds each one in full,',
    '  handwriting included ("ink": strokes of [x, y, pressure] points, each on a page).',
    '- voice-notes.json lists the notes; voice-notes/ holds each recording, named by date and label.',
    '',
    'Not included: anything in the Trash, and changes still waiting on a device to sync.',
    'The nightly backup (docs/backups.md) is the copy to restore the whole app from.',
  ]
  if (missing.length) {
    lines.push('', `These ${missing.length} recordings couldn't be downloaded:`, ...missing.map((m) => '- ' + m))
  }
  return lines.join('\n') + '\n'
}
