/**
 * A ZIP file built in the browser, for "Download everything".
 *
 * Entries are stored as they are, not compressed: the audio is compressed already, and storing
 * keeps this small enough to read in one sitting. Any unzip tool opens it (Files on iPhone,
 * Finder, Windows, Python's zipfile).
 *
 * Pattern: a ZIP is a list of files, each behind a small "local header" (its name, size and
 * CRC-32 checksum), then a "central directory" repeating those headers with where each file
 * starts, then an end record pointing at that directory. Unzip tools read from the end.
 * All numbers are little-endian. Without the ZIP64 extension, the whole file must stay under
 * 4 GB and 65,535 entries, which a JokeBox is far from.
 */

export interface ZipEntry {
  /** The path inside the archive, with forward slashes: "jokes.json", "voice-notes/a.m4a". */
  name: string
  data: Uint8Array<ArrayBuffer>
}

const MAX_32 = 0xffffffff
const MAX_ENTRIES = 0xffff
const UTF8_NAMES = 0x0800 // flag bit 11: names are UTF-8, so Hindi file names survive
const VERSION = 20 // "2.0", the version every unzip tool reads

let table: Uint32Array | undefined

/** The CRC-32 checksum ZIP stores for each file (the same one gzip and PNG use). */
export function crc32(data: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c >>> 0
    }
  }
  let crc = MAX_32
  for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ MAX_32) >>> 0
}

/** The time and date as MS-DOS packs them: two-second steps, years from 1980. */
function dosTime(when: Date): { time: number; date: number } {
  const year = Math.max(when.getFullYear(), 1980)
  return {
    time: (when.getHours() << 11) | (when.getMinutes() << 5) | Math.floor(when.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate(),
  }
}

/** A header of fixed-size numbers followed by the file name. */
function header(fields: [bytes: 2 | 4, value: number][], name: Uint8Array): Uint8Array<ArrayBuffer> {
  const size = fields.reduce((sum, [bytes]) => sum + bytes, 0)
  const out = new Uint8Array(size + name.length)
  const view = new DataView(out.buffer)
  let at = 0
  for (const [bytes, value] of fields) {
    if (bytes === 2) view.setUint16(at, value, true)
    else view.setUint32(at, value, true)
    at += bytes
  }
  out.set(name, size)
  return out
}

/** Every entry in one ZIP file. Names must be unique. */
export function zip(entries: ZipEntry[], when: Date = new Date()): Blob {
  if (entries.length > MAX_ENTRIES) throw new Error('Too many files for one ZIP')
  const names = new Set<string>()
  const { time, date } = dosTime(when)
  const encoder = new TextEncoder()
  const parts: Uint8Array<ArrayBuffer>[] = []
  const directory: Uint8Array<ArrayBuffer>[] = []
  let offset = 0
  for (const entry of entries) {
    if (names.has(entry.name)) throw new Error(`Two files are both called ${entry.name}`)
    names.add(entry.name)
    const name = encoder.encode(entry.name)
    const crc = crc32(entry.data)
    const size = entry.data.length
    // Shared by both headers: version needed, flags, method 0 (stored), time, date, checksum,
    // stored size, real size, name length, extra length.
    const common: [2 | 4, number][] = [
      [2, VERSION], [2, UTF8_NAMES], [2, 0], [2, time], [2, date],
      [4, crc], [4, size], [4, size], [2, name.length], [2, 0],
    ]
    const local = header([[4, 0x04034b50], ...common], name)
    // Then: comment length, disk, internal and external attributes, where the file starts.
    directory.push(header([[4, 0x02014b50], [2, VERSION], ...common, [2, 0], [2, 0], [2, 0], [4, 0], [4, offset]], name))
    parts.push(local, entry.data)
    offset += local.length + size
    if (offset > MAX_32) throw new Error('Too big for one ZIP')
  }
  const directorySize = directory.reduce((sum, part) => sum + part.length, 0)
  if (offset + directorySize > MAX_32) throw new Error('Too big for one ZIP')
  const end = header(
    [[4, 0x06054b50], [2, 0], [2, 0], [2, entries.length], [2, entries.length], [4, directorySize], [4, offset], [2, 0]],
    new Uint8Array(),
  )
  return new Blob([...parts, ...directory, end], { type: 'application/zip' })
}

/** A text file for the archive, as UTF-8. */
export const textFile = (name: string, text: string): ZipEntry => ({ name, data: new TextEncoder().encode(text) })
