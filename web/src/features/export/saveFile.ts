/**
 * Hand a finished file to the person: the share sheet on a phone or tablet (where "Save to
 * Files" lives, and where a plain download can't reach from the installed app), a normal
 * download everywhere else.
 *
 * Call it straight from a tap: the share sheet only opens in answer to one.
 */
export async function saveFile(file: Blob, name: string): Promise<void> {
  const shared = new File([file], name, { type: file.type })
  const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
  if (touch && navigator.canShare?.({ files: [shared] })) {
    try {
      await navigator.share({ files: [shared] })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return // closed the sheet
      // Sharing refused: fall back to a download below.
    }
  }
  const url = URL.createObjectURL(file)
  const link = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.append(link)
  link.click()
  link.remove()
  // Safari reads the file after click() returns, so the address must outlive it for a while.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
