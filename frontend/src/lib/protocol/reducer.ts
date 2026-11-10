// Reducer thuần: cùng chuỗi sự kiện → cùng state. Đặc tả: docs/api/assistant-openapi.yaml.
import type { Envelope, ErrorInfo } from './events'
import type { ConversationDetail, ItemKind, Usage } from './types'

export type ItemStatus = 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled' | 'abandoned'
export type TurnStatus = 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled'

export interface Item {
  id: string
  /** Có thể là giá trị lạ do server mới hơn client: UI phải có nhánh mặc định. */
  kind: ItemKind | (string & {})
  turnId: string
  parentId: string | null
  revision: number
  status: ItemStatus
  seq: number
  data: Record<string, any>
}

export interface Turn {
  id: string
  status: TurnStatus
  startedAt: number
  endedAt?: number
  assistant?: string
  usage?: Usage
  error?: ErrorInfo
}

export interface ConversationState {
  items: Record<string, Item>
  /** item_id theo thứ tự xuất hiện */
  order: string[]
  turns: Record<string, Turn>
  turnOrder: string[]
  activeTurnId: string | null
  /** seq lớn nhất đã áp dụng; 0 = chưa biết. */
  lastSeq: number
  title?: string
  /** còn lượt cũ hơn chưa tải (phân trang theo lượt) và seq đầu của cửa sổ đã có */
  hasMoreBefore?: boolean
  firstSeq?: number
}

export type Outcome = 'applied' | 'duplicate' | 'gap' | 'reset'
export interface Applied { state: ConversationState; outcome: Outcome }

export function initialState(): ConversationState {
  return { items: {}, order: [], turns: {}, turnOrder: [], activeTurnId: null, lastSeq: 0 }
}

/** Dựng state từ GET /conversations/{id}. Mở stream với after = state.lastSeq. */
export function hydrate(detail: ConversationDetail): ConversationState {
  const state = initialState()
  for (const raw of detail.items) {
    const kind = raw.item_kind
    state.items[raw.item_id] = {
      id: raw.item_id, kind, turnId: raw.turn_id, parentId: raw.parent_item_id ?? null, revision: raw.revision,
      status: raw.status, seq: raw.seq ?? 0, data: { ...(raw.data ?? {}) },
    }
    state.order.push(raw.item_id)
    if (!state.turns[raw.turn_id]) {
      state.turns[raw.turn_id] = { id: raw.turn_id, status: 'completed', startedAt: 0 }
      state.turnOrder.push(raw.turn_id)
    }
  }
  const active = detail.active_turn
  if (active) {
    const turn = state.turns[active.turn_id] ?? { id: active.turn_id, status: active.status, startedAt: 0 }
    turn.status = active.status
    state.turns[active.turn_id] = turn
    if (!state.turnOrder.includes(active.turn_id)) state.turnOrder.push(active.turn_id)
    state.activeTurnId = active.turn_id
  }
  state.lastSeq = detail.last_seq
  state.title = detail.conversation.title
  state.hasMoreBefore = Boolean(detail.has_more_before)
  state.firstSeq = detail.first_seq ?? 0
  return state
}

/** Ghép trang cũ hơn vào đầu hội thoại (item đã có thì giữ bản hiện tại; không đụng lastSeq, lượt đang chạy). */
export function prependEarlier(state: ConversationState, detail: ConversationDetail): ConversationState {
  const older = hydrate({ ...detail, active_turn: null })
  const items = { ...older.items, ...state.items }
  const order = [...older.order.filter(id => !state.items[id]), ...state.order]
  const turns = { ...older.turns, ...state.turns }
  const turnOrder = [...older.turnOrder.filter(id => !state.turns[id]), ...state.turnOrder]
  return { ...state, items, order, turns, turnOrder, hasMoreBefore: Boolean(detail.has_more_before), firstSeq: detail.first_seq ?? state.firstSeq ?? 0 }
}

const TEXT_KINDS = new Set(['answer', 'commentary', 'reasoning', 'evidence', 'todo'])

function closeItems(state: ConversationState, turnId: string, mode: 'completed' | 'waiting' | 'failed' | 'cancelled'): void {
  for (const id of state.order) {
    const item = state.items[id]
    if (!item || item.turnId !== turnId || (item.status !== 'running' && item.status !== 'waiting')) continue
    const interactive = item.kind === 'question' || item.kind === 'approval'
    let status: ItemStatus
    if (mode === 'waiting') {
      if (interactive) status = 'waiting'
      else if (item.kind === 'tool' && item.data['blocked']) status = 'running'
      else status = 'completed'
    } else if (mode === 'completed') status = interactive ? 'cancelled' : 'completed'
    else if (mode === 'cancelled') status = 'cancelled'
    else status = TEXT_KINDS.has(item.kind) ? 'completed' : 'abandoned'
    if (status !== item.status) state.items[id] = { ...item, status }
  }
}

function appendDelta(data: Record<string, any>, payload: Record<string, any>): Record<string, any> {
  const next = { ...data }
  if (typeof payload['field'] === 'string' && typeof payload['delta'] === 'string') {
    const field = payload['field']
    next[field] = String(next[field] ?? '') + payload['delta']
  } else if (typeof payload['text'] === 'string') {
    next['text'] = String(next['text'] ?? '') + payload['text']
  }
  return next
}

/** Áp dụng một sự kiện. Không sửa state cũ. */
export function applyEvent(prev: ConversationState, event: Envelope): Applied {
  if (event.type === 'stream.reset') return { state: prev, outcome: 'reset' }
  if (event.seq <= prev.lastSeq) return { state: prev, outcome: 'duplicate' }
  if (prev.lastSeq > 0 && event.seq > prev.lastSeq + 1) return { state: prev, outcome: 'gap' }

  const state: ConversationState = { ...prev, items: { ...prev.items }, turns: { ...prev.turns }, order: prev.order, turnOrder: prev.turnOrder, lastSeq: event.seq }
  const payload = (event.payload ?? {}) as Record<string, any>
  const turnId = event.turn_id ?? state.activeTurnId ?? ''

  switch (event.type) {
    case 'run.started': {
      state.turns[turnId] = { id: turnId, status: 'running', startedAt: event.ts, assistant: payload['assistant'] }
      if (!state.turnOrder.includes(turnId)) state.turnOrder = [...state.turnOrder, turnId]
      state.activeTurnId = turnId
      break
    }
    case 'run.waiting': {
      closeItems(state, turnId, 'waiting')
      const turn = state.turns[turnId]
      if (turn) state.turns[turnId] = { ...turn, status: 'waiting' }
      break
    }
    case 'run.completed':
    case 'run.failed':
    case 'run.cancelled': {
      const mode = event.type === 'run.completed' ? 'completed' : event.type === 'run.failed' ? 'failed' : 'cancelled'
      closeItems(state, turnId, mode)
      const turn = state.turns[turnId] ?? { id: turnId, status: 'running' as TurnStatus, startedAt: event.ts }
      state.turns[turnId] = {
        ...turn, status: mode, endedAt: event.ts,
        ...(payload['usage'] ? { usage: payload['usage'] } : {}), ...(payload['error'] ? { error: payload['error'] } : {}),
      }
      if (state.activeTurnId === turnId) state.activeTurnId = null
      if (typeof payload['title'] === 'string') state.title = payload['title']
      break
    }
    case 'notice': {
      const id = `notice:${event.seq}`
      state.items[id] = { id, kind: 'notice', turnId, parentId: null, revision: 1, status: 'completed', seq: event.seq, data: payload }
      state.order = [...state.order, id]
      break
    }
    case 'item.started':
    case 'item.delta':
    case 'item.updated':
    case 'item.completed':
    case 'item.failed': {
      const id = event.item_id
      if (!id) break
      const existing = state.items[id]
      if (existing && event.revision !== undefined && event.revision <= existing.revision) break   // phát lại chồng
      const kind = event.item_kind ?? existing?.kind ?? 'notice'
      if (!existing) {
        // delta/updated tới trước started (mất khung): tạo tạm để không mất dữ liệu
        state.items[id] = { id, kind, turnId, parentId: event.parent_item_id ?? null, revision: 0, status: 'running', seq: event.seq, data: {} }
        state.order = [...state.order, id]
      }
      const item = state.items[id] as Item
      let data = item.data
      let status = item.status
      if (event.type === 'item.started') data = { ...data, ...payload }
      else if (event.type === 'item.delta') data = appendDelta(data, payload)
      else if (event.type === 'item.updated') data = { ...data, ...payload }
      else if (event.type === 'item.completed') { data = { ...data, ...payload }; status = 'completed' }
      else { data = { ...data, ...payload }; status = 'failed' }
      state.items[id] = { ...item, kind, data, status, revision: event.revision ?? item.revision + 1 }
      break
    }
    default:
      break   // type lạ của server mới hơn: bỏ qua nhưng vẫn tiến seq
  }
  return { state, outcome: 'applied' }
}

/** Áp dụng nhiều sự kiện; dừng ở khoảng trống đầu tiên. */
export function applyAll(state: ConversationState, events: Envelope[]): { state: ConversationState; gapAt?: number } {
  let current = state
  for (const event of events) {
    const result = applyEvent(current, event)
    if (result.outcome === 'gap') return { state: current, gapAt: event.seq }
    current = result.state
  }
  return { state: current }
}
