// Chiếu ConversationState thành cấu trúc giao diện: mỗi lượt = tin người dùng + khối tiến trình + thẻ tương tác + artifact + câu trả lời.
import type { ConversationState, Item, Turn } from '@assistant/protocol'

const STEP_KINDS = new Set(['tool', 'commentary', 'reasoning', 'todo', 'subagent', 'evidence'])

export interface TurnView {
  id: string
  turn: Turn
  user?: Item
  /** Các bước hiển thị trong khối tiến trình (đã ẩn tool nội bộ). */
  steps: Item[]
  todo?: Item
  interactive: Item[]
  artifacts: Item[]
  evidence: Item[]
  /** Câu trả lời cuối của trợ lý (item `answer` cuối cùng). */
  answer?: Item
  notices: Item[]
}

export function selectTurns(state: ConversationState): TurnView[] {
  const byTurn = new Map<string, Item[]>()
  for (const id of state.order) {
    const item = state.items[id]
    if (!item) continue
    const list = byTurn.get(item.turnId)
    if (list) list.push(item)
    else byTurn.set(item.turnId, [item])
  }
  const turnIds = [...new Set([...state.turnOrder, ...byTurn.keys()])]
  return turnIds.map(id => {
    const items = byTurn.get(id) ?? []
    const turn = state.turns[id] ?? { id, status: 'completed' as const, startedAt: 0 }
    const todos = items.filter(i => i.kind === 'todo')
    const answers = items.filter(i => i.kind === 'answer')
    return {
      id, turn,
      ...(items.find(i => i.kind === 'user') ? { user: items.find(i => i.kind === 'user') as Item } : {}),
      steps: items.filter(i => STEP_KINDS.has(i.kind) && i.kind !== 'todo' && i.kind !== 'evidence' && !i.data['hidden'] && !i.parentId),
      ...(todos.length ? { todo: todos[todos.length - 1] as Item } : {}),
      interactive: items.filter(i => i.kind === 'question' || i.kind === 'approval'),
      artifacts: items.filter(i => i.kind === 'artifact'),
      evidence: items.filter(i => i.kind === 'evidence'),
      ...(answers.length ? { answer: answers[answers.length - 1] as Item } : {}),
      notices: items.filter(i => i.kind === 'notice' || i.kind === 'error'),
    }
  })
}

/** Câu hỏi / approval đang chờ người dùng (thẻ chiếm chỗ ô soạn). */
export function selectPending(state: ConversationState): Item | undefined {
  for (let i = state.order.length - 1; i >= 0; i -= 1) {
    const item = state.items[state.order[i] as string]
    if (!item) continue
    if (item.kind === 'question' && (item.status === 'running' || item.status === 'waiting') && ['open', 'continued', undefined].includes(item.data['state'])) return item
    if (item.kind === 'approval' && (item.status === 'running' || item.status === 'waiting') && ['pending', undefined].includes(item.data['state'])) return item
  }
  return undefined
}

/** Có đang chờ model/tool (không tính chờ người dùng). */
export function isBusy(state: ConversationState): boolean {
  if (!state.activeTurnId) return false
  return state.turns[state.activeTurnId]?.status === 'running'
}
