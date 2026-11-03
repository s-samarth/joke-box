/**
 * Bodies sent and received gzip-packed, so a session full of handwriting fits the host's 4.5 MB
 * limit. Pen strokes are mostly numbers, which gzip shrinks about 3x. The server side is
 * app/packed.py.
 *
 * Packed bodies carry their own content type rather than `Content-Encoding: gzip`, so nothing on
 * the way (the host, a proxy, the browser) unpacks or recounts them: we pack and unpack here.
 * CompressionStream is built into every current browser (Safari since 16.4); without it a save
 * just goes out plain, as before.
 */
export const PACKED_JSON = 'application/x-jokebox-gzip-json'

/** Smaller saves go out plain: packing them gains nothing worth the work. */
export const PACK_OVER = 64 * 1024

export const canPack = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'

export async function pack(text: string): Promise<Blob> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Response(stream).blob()
}

export async function unpack(body: NonNullable<Response['body']>): Promise<string> {
  return new Response(body.pipeThrough(new DecompressionStream('gzip'))).text()
}

/** The body and its content type for a request: packed when it's big and the browser can. */
export async function requestBody(body: unknown): Promise<{ data: string | Blob; type: string }> {
  const text = JSON.stringify(body)
  if (text.length > PACK_OVER && canPack()) return { data: await pack(text), type: PACKED_JSON }
  return { data: text, type: 'application/json' }
}
