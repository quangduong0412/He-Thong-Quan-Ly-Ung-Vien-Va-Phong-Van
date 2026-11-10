import { describe, expect, it } from 'vitest'

import { EventBuilder } from './testing'
import { EventStream, type StreamStatus } from './sse'
import type { UiEvent } from './events'

const enc = new TextEncoder()

function sseBody(events: UiEvent[], { endOpen = false }: { endOpen?: boolean } = {}): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(enc.encode(': ping\n\n'))
      for (const e of events) controller.enqueue(enc.encode(`id: ${e.seq}\nevent: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`))
      if (!endOpen) controller.close()
    },
  })
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

function harness(responses: (Response | Error)[]) {
  const urls: string[] = []
  const statuses: StreamStatus[] = []
  const received: UiEvent[] = []
  const sleeps: number[] = []
  let applied = 0
  const stream = new EventStream({
    url: after => `/s?after=${after}`,
    getAfter: () => applied,
    onEvent: e => { received.push(e); applied = Math.max(applied, e.seq) },
    onStatus: s => statuses.push(s),
    fetch: (async (url: string) => {
      urls.push(url)
      const next = responses.shift()
      if (!next) { stream.stop(); return new Response('', { status: 200 }) }
      if (next instanceof Error) throw next
      return next
    }) as typeof fetch,
    sleep: async ms => { sleeps.push(ms) },
    random: () => 0.5,
  })
  return { stream, urls, statuses, received, sleeps }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 20))

describe('EventStream', () => {
  it('nối lại từ seq đã áp dụng sau khi đứt, backoff tăng dần', async () => {
    const b = new EventBuilder().runStarted().started('answer', 'a', {}).delta('a', { text: 'x' }).delta('a', { text: 'y' })
    const events = b.events
    const h = harness([sseBody(events.slice(0, 2)), new Error('mất mạng'), new Error('mất mạng'), sseBody(events.slice(2))])
    h.stream.start()
    await flush()
    expect(h.urls).toEqual(['/s?after=0', '/s?after=2', '/s?after=2', '/s?after=2', '/s?after=4'])   // stream đóng → luôn nối lại
    expect(h.received.map(e => e.seq)).toEqual([1, 2, 3, 4])
    // stream đóng (1s) → lỗi lần 1 (2s) → lỗi lần 2 (4s) → nối được rồi đóng, backoff về 1s (jitter 0.5 → ×1.0)
    expect(h.sleeps).toEqual([1000, 2000, 4000, 1000])
  })

  it('không thử lại khi 401/403/404', async () => {
    for (const status of [401, 403, 404]) {
      const h = harness([new Response('', { status })])
      h.stream.start()
      await flush()
      expect(h.urls).toHaveLength(1)
      expect(h.statuses.at(-1)).toBe('fatal')
      expect(h.stream.running).toBe(false)
    }
  })

  it('bỏ qua khung không phải JSON/không phải sự kiện v1', async () => {
    const good = new EventBuilder().runStarted().events[0] as UiEvent
    const body = new Response(`data: not json\n\ndata: {"v":2,"event_id":"x","type":"a"}\n\nid: 1\ndata: ${JSON.stringify(good)}\n\n`, { status: 200 })
    const h = harness([body])
    h.stream.start()
    await flush()
    expect(h.received).toHaveLength(1)
  })
})
