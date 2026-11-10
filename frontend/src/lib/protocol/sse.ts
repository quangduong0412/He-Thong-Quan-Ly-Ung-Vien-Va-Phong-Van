// Parser SSE và vòng nối lại stream (backoff + jitter, heartbeat, không thử lại khi 401/403/404).
import { parseEvent, type UiEvent } from './events'

export interface SseFrame { id?: string; event?: string; data: string }

/** Tách khung SSE từ luồng byte; chịu được chunk cắt giữa dòng/khung. */
export async function* parseSse(body: AsyncIterable<Uint8Array>): AsyncGenerator<SseFrame> {
  const decoder = new TextDecoder()
  let buffer = ''
  const frames = function* (flush: boolean): Generator<SseFrame> {
    for (;;) {
      const match = /\r?\n\r?\n/.exec(buffer)
      if (!match) break
      const block = buffer.slice(0, match.index)
      buffer = buffer.slice(match.index + match[0].length)
      const frame = toFrame(block)
      if (frame) yield frame
    }
    if (flush && buffer.trim()) {
      const frame = toFrame(buffer)
      buffer = ''
      if (frame) yield frame
    }
  }
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true })
    yield* frames(false)
  }
  buffer += decoder.decode()
  yield* frames(true)
}

function toFrame(block: string): SseFrame | undefined {
  const data: string[] = []
  const frame: SseFrame = { data: '' }
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue
    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '')
    if (field === 'data') data.push(value)
    else if (field === 'id') frame.id = value
    else if (field === 'event') frame.event = value
  }
  if (data.length === 0) return undefined
  frame.data = data.join('\n')
  return frame
}

export type StreamStatus = 'connecting' | 'open' | 'reconnecting' | 'closed' | 'fatal'

export interface EventStreamOptions {
  /** URL stream; after = seq đã áp dụng. */
  url: (after: number) => string
  getAfter: () => number
  onEvent: (event: UiEvent) => void
  onStatus?: (status: StreamStatus, info?: { status?: number; attempt?: number; error?: unknown }) => void
  fetch?: typeof fetch
  headers?: () => HeadersInit | Promise<HeadersInit>
  /** Không có byte nào trong chừng này ms → coi là đứt (heartbeat 15 giây). */
  idleTimeoutMs?: number
  backoffMs?: number[]
  random?: () => number
  sleep?: (ms: number) => Promise<void>
}

const DEFAULT_BACKOFF = [1000, 2000, 4000, 8000, 15000]

export class EventStream {
  #opts: EventStreamOptions
  #abort?: AbortController
  #running = false
  #wake?: () => void

  constructor(opts: EventStreamOptions) {
    this.#opts = opts
  }

  get running(): boolean {
    return this.#running
  }

  start(): void {
    if (this.#running) return
    this.#running = true
    void this.#loop()
  }

  stop(): void {
    this.#running = false
    this.#abort?.abort()
    this.#wake?.()
    this.#opts.onStatus?.('closed')
  }

  /** Mở lại ngay (sau khi tải lại trạng thái vì stream.reset, hoặc khi mạng quay lại). */
  restart(): void {
    this.#abort?.abort()
    this.#wake?.()
    if (!this.#running) this.start()
  }

  async #loop(): Promise<void> {
    const o = this.#opts
    const doFetch = o.fetch ?? fetch
    const backoff = o.backoffMs ?? DEFAULT_BACKOFF
    const sleep = o.sleep ?? ((ms: number) => new Promise<void>(resolve => { const t = setTimeout(resolve, ms); this.#wake = () => { clearTimeout(t); resolve() } }))
    const random = o.random ?? Math.random
    let attempt = 0
    while (this.#running) {
      const abort = new AbortController()
      this.#abort = abort
      o.onStatus?.(attempt === 0 ? 'connecting' : 'reconnecting', { attempt })
      let idle: ReturnType<typeof setTimeout> | undefined
      const arm = () => {
        if (!o.idleTimeoutMs) return
        clearTimeout(idle)
        idle = setTimeout(() => abort.abort(new Error('idle')), o.idleTimeoutMs)
      }
      try {
        const response = await doFetch(o.url(o.getAfter()), {
          headers: { accept: 'text/event-stream', ...(o.headers ? await o.headers() : {}) },
          signal: abort.signal,
        })
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          this.#running = false
          o.onStatus?.('fatal', { status: response.status })
          return
        }
        if (!response.ok || !response.body) throw new Error(`stream trả ${response.status}`)
        o.onStatus?.('open')
        attempt = 0
        arm()
        for await (const frame of parseSse(response.body as unknown as AsyncIterable<Uint8Array>)) {
          arm()
          let parsed: unknown
          try { parsed = JSON.parse(frame.data) } catch { continue }
          const event = parseEvent(parsed)
          if (event) o.onEvent(event)
        }
      } catch (error) {
        if (!this.#running) return
        o.onStatus?.('reconnecting', { attempt, error })
      } finally {
        clearTimeout(idle)
      }
      if (!this.#running) return
      const base = backoff[Math.min(attempt, backoff.length - 1)] ?? 15000
      attempt += 1
      await sleep(Math.round(base * (0.8 + random() * 0.4)))
    }
  }
}
