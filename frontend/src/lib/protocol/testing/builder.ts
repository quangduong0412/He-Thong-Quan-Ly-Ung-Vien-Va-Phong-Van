// Dựng chuỗi sự kiện UI v1 hợp lệ cho kiểm thử: tự gán seq, event_id, revision, ts.
// Không dùng trong code chạy thật (server mới là nơi gán seq).
import type { Envelope } from '../events'
import type { ItemKind } from '../types'

export interface Scheduled { delay: number; event: Envelope }

export class EventBuilder {
  readonly timeline: Scheduled[] = []
  #seq: number
  #pending = 0
  #clock: number
  #kinds = new Map<string, ItemKind>()
  #revisions = new Map<string, number>()
  #conversation: string
  #turn: string

  constructor(opts: { conversation?: string; turn?: string; startSeq?: number; startTs?: number } = {}) {
    this.#conversation = opts.conversation ?? 'c_demo'
    this.#turn = opts.turn ?? 't_1'
    this.#seq = opts.startSeq ?? 0
    this.#clock = opts.startTs ?? 1_791_790_000
  }

  get events(): Envelope[] {
    return this.timeline.map(s => s.event)
  }

  get lastSeq(): number {
    return this.#seq
  }

  /** Nhận một item đã có từ lượt trước (vd câu hỏi trả lời muộn) để revision tiếp nối. */
  adopt(id: string, kind: ItemKind, revision: number): this {
    this.#kinds.set(id, kind)
    this.#revisions.set(id, revision)
    return this
  }

  turn(id: string): this {
    this.#turn = id
    return this
  }

  /** Chờ `ms` trước sự kiện kế tiếp (chỉ ảnh hưởng timeline khi phát lại). */
  wait(ms: number): this {
    this.#pending += ms
    return this
  }

  #push(type: string, extra: Partial<Envelope>, payload?: Record<string, unknown>): Envelope {
    this.#seq += 1
    this.#clock += this.#pending / 1000
    const event: Envelope = {
      v: 1, event_id: `${this.#conversation}:${this.#seq}`, seq: this.#seq, ts: Math.round(this.#clock * 1000) / 1000,
      type, turn_id: this.#turn, ...extra, ...(payload ? { payload } : {}),
    }
    this.timeline.push({ delay: this.#pending, event })
    this.#pending = 0
    return event
  }

  runStarted(payload: Record<string, unknown> = { assistant: 'hr-recruiter' }): this {
    this.#push('run.started', {}, payload)
    return this
  }

  runWaiting(reasons: { kind: 'question' | 'approval'; item_id: string }[]): this {
    this.#push('run.waiting', {}, { reasons })
    return this
  }

  runCompleted(payload: Record<string, unknown> = { usage: { input_tokens: 1200, output_tokens: 240, duration_ms: 4200 } }): this {
    this.#push('run.completed', {}, payload)
    return this
  }

  runFailed(error: { code: string; message: string; retryable?: boolean }): this {
    this.#push('run.failed', {}, { error })
    return this
  }

  runCancelled(): this {
    this.#push('run.cancelled', {}, {})
    return this
  }

  notice(payload: Record<string, unknown>): this {
    this.#push('notice', {}, payload)
    return this
  }

  started(kind: ItemKind, id: string, payload: Record<string, unknown> = {}, parent?: string): this {
    this.#kinds.set(id, kind)
    this.#revisions.set(id, 1)
    this.#push('item.started', { item_id: id, item_kind: kind, revision: 1, parent_item_id: parent ?? null }, payload)
    return this
  }

  #item(type: string, id: string, payload: Record<string, unknown>, kind?: ItemKind): this {
    const next = (this.#revisions.get(id) ?? 0) + 1
    this.#revisions.set(id, next)
    if (kind) this.#kinds.set(id, kind)
    this.#push(type, { item_id: id, item_kind: this.#kinds.get(id), revision: next }, payload)
    return this
  }

  /** Item chỉ có một sự kiện completed (vd tin nhắn người dùng). */
  done(kind: ItemKind, id: string, payload: Record<string, unknown> = {}): this {
    this.#kinds.set(id, kind)
    this.#revisions.set(id, 1)
    this.#push('item.completed', { item_id: id, item_kind: kind, revision: 1, parent_item_id: null }, payload)
    return this
  }

  delta(id: string, payload: Record<string, unknown>): this {
    return this.#item('item.delta', id, payload)
  }

  /** Stream văn bản thành nhiều delta nhỏ (mỗi `size` ký tự, cách nhau `every` ms). */
  stream(id: string, text: string, size = 14, every = 30, field?: string): this {
    for (let i = 0; i < text.length; i += size) {
      const piece = text.slice(i, i + size)
      this.wait(every)
      this.delta(id, field ? { field, delta: piece } : { text: piece })
    }
    return this
  }

  updated(id: string, payload: Record<string, unknown>, newKind?: ItemKind): this {
    return this.#item('item.updated', id, payload, newKind)
  }

  completed(id: string, payload: Record<string, unknown> = {}): this {
    return this.#item('item.completed', id, payload)
  }

  failed(id: string, error: { code: string; message: string }, extra: Record<string, unknown> = {}): this {
    return this.#item('item.failed', id, { error, ...extra })
  }
}
