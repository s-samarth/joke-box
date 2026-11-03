import { describe, expect, it } from 'vitest'
import { crc32, textFile, zip, type ZipEntry } from './zip'

const bytes = (text: string) => new TextEncoder().encode(text)

/** Read a ZIP back the way unzip tools do: from the end record, through the directory. */
async function unzip(blob: Blob): Promise<{ name: string; text: string; crc: number }[]> {
  const data = new Uint8Array(await blob.arrayBuffer())
  const view = new DataView(data.buffer)
  const end = data.length - 22
  expect(view.getUint32(end, true)).toBe(0x06054b50)
  const count = view.getUint16(end + 10, true)
  let at = view.getUint32(end + 16, true)
  const files = []
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50)
    expect(view.getUint16(at + 8, true) & 0x0800).toBe(0x0800)
    const crc = view.getUint32(at + 16, true)
    const size = view.getUint32(at + 20, true)
    const nameLength = view.getUint16(at + 28, true)
    const local = view.getUint32(at + 42, true)
    const name = new TextDecoder().decode(data.subarray(at + 46, at + 46 + nameLength))
    expect(view.getUint32(local, true)).toBe(0x04034b50)
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
    const content = data.subarray(start, start + size)
    expect(crc32(content)).toBe(crc)
    files.push({ name, text: new TextDecoder().decode(content), crc })
    at += 46 + nameLength
  }
  return files
}

describe('crc32', () => {
  it('matches the standard check values', () => {
    expect(crc32(bytes('123456789'))).toBe(0xcbf43926)
    expect(crc32(new Uint8Array())).toBe(0)
  })
})

describe('zip', () => {
  it('stores each file so it reads back the same', async () => {
    const entries: ZipEntry[] = [
      textFile('jokes.json', '[{"setup":"A made-up setup"}]'),
      textFile('voice-notes/नोट.txt', 'बनाया हुआ'),
      { name: 'empty.bin', data: new Uint8Array() },
    ]
    const files = await unzip(zip(entries, new Date(2026, 10, 3, 21, 30, 15)))
    expect(files.map((f) => [f.name, f.text])).toEqual([
      ['jokes.json', '[{"setup":"A made-up setup"}]'],
      ['voice-notes/नोट.txt', 'बनाया हुआ'],
      ['empty.bin', ''],
    ])
  })

  it('packs the date the way MS-DOS does', async () => {
    const data = new Uint8Array(await zip([textFile('a.txt', 'a')], new Date(2026, 10, 3, 21, 30, 15)).arrayBuffer())
    const view = new DataView(data.buffer)
    expect(view.getUint16(10, true)).toBe((21 << 11) | (30 << 5) | 7)
    expect(view.getUint16(12, true)).toBe((46 << 9) | (11 << 5) | 3)
  })

  it('refuses two files with the same name', () => {
    expect(() => zip([textFile('a.json', '1'), textFile('a.json', '2')])).toThrow('a.json')
  })

  it('makes an empty archive from no files', async () => {
    expect(await unzip(zip([]))).toEqual([])
  })
})
