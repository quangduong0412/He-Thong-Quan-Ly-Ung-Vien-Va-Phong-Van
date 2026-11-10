// Sự kiện giao thức UI v1 — đặc tả: docs/api/assistant-openapi.yaml (Event, ItemState). Server có thể gửi thêm trường/loại lạ; client phải chịu được
// (xem isKnownType, reducer bỏ qua phần không hiểu).
import type { Answer, ItemKind, PageContext, QuestionSpec, Usage } from './types'

export const PROTOCOL_VERSION = 1

export type RunEventType = 'run.started' | 'run.waiting' | 'run.completed' | 'run.failed' | 'run.cancelled'
export type ItemEventType = 'item.started' | 'item.delta' | 'item.updated' | 'item.completed' | 'item.failed'
export type EventType = RunEventType | ItemEventType | 'notice' | 'stream.reset'

export interface Envelope<T extends string = string, P = Record<string, unknown>> {
  v: 1
  event_id: string
  seq: number
  /** epoch giây */
  ts: number
  type: T
  turn_id?: string
  item_id?: string
  item_kind?: ItemKind
  parent_item_id?: string | null
  revision?: number
  payload?: P
}

export interface ErrorInfo { code: string; message: string; retryable?: boolean; details?: Record<string, unknown> }

// ---- payload theo loại item (data đã gộp của ItemState có cùng hình dạng, các trường đều tuỳ chọn) ----
export interface UserData { message_id: string; client_message_id?: string; text: string; files?: { id: string; name: string; size: number }[]; context?: PageContext }
export interface AnswerData { provisional?: boolean; text?: string; message_id?: string; citations?: { n: number; source_id: string }[]; usage?: Usage; demoted?: boolean }
export interface ReasoningData { text?: string; duration_ms?: number }
export interface ToolData {
  tool?: string; title?: string; summary?: string; icon?: string; read_only?: boolean; arguments?: Record<string, unknown>
  group_key?: string; hidden?: boolean; ok?: boolean; duration_ms?: number; render_hint?: string; result?: unknown; error?: ErrorInfo
}
export interface TodoItem { content: string; status: 'pending' | 'in_progress' | 'completed' }
export interface TodoData { items?: TodoItem[] }
export interface QuestionData {
  question_id?: string; questions?: QuestionSpec[]; timed?: boolean; deadline_at?: string
  state?: 'open' | 'continued' | 'answered' | 'skipped' | 'expired' | 'cancelled'; answers?: Answer[]; late?: boolean
}
export interface ApprovalData {
  approval_id?: string; tool?: string; title?: string; summary?: string; arguments?: Record<string, unknown>
  risk?: 'write' | 'destructive'; grants?: ('once' | 'conversation')[]; editable?: boolean; deadline_at?: string; preview_hint?: string
  group_key?: string; state?: 'pending' | 'allowed' | 'rejected' | 'expired' | 'cancelled'; grant?: 'once' | 'conversation'
  edited_arguments?: Record<string, unknown>; reason?: string
}
export interface ArtifactData {
  artifact_id?: string; artifact_type?: string; title?: string; type?: string; content?: string; operation?: 'create' | 'update'
  base_version?: number; version?: number; state?: 'streaming' | 'ready' | 'failed'; summary?: string; size?: number; sha256?: string; error?: ErrorInfo
}
export interface EvidenceSource { id: string; title: string; collection: string; snippet?: string; locator?: string; url?: string }
export interface EvidenceData { query?: string; sources?: EvidenceSource[] }
export interface SubagentData { goal?: string; summary?: string }
export interface NoticeData { level?: 'info' | 'warning' | 'error'; code?: string; message?: string; action?: { kind: 'retry' | 'open_url'; label: string; url?: string } }

export interface ItemDataByKind {
  user: UserData
  answer: AnswerData
  commentary: AnswerData
  reasoning: ReasoningData
  tool: ToolData
  todo: TodoData
  question: QuestionData
  approval: ApprovalData
  artifact: ArtifactData
  evidence: EvidenceData
  subagent: SubagentData
  notice: NoticeData
  error: NoticeData
}

export interface RunStartedPayload { assistant: string; message_id?: string; model?: string }
export interface RunWaitingPayload { reasons: { kind: 'question' | 'approval'; item_id: string }[] }
export interface RunCompletedPayload { usage?: Usage; title?: string }
export interface RunFailedPayload { error: ErrorInfo }
export interface StreamResetPayload { reason: string; first_seq?: number }

export type UiEvent = Envelope

const TYPES: ReadonlySet<string> = new Set<EventType>([
  'run.started', 'run.waiting', 'run.completed', 'run.failed', 'run.cancelled',
  'item.started', 'item.delta', 'item.updated', 'item.completed', 'item.failed', 'notice', 'stream.reset',
])
const KINDS: ReadonlySet<string> = new Set<ItemKind>([
  'user', 'answer', 'commentary', 'reasoning', 'tool', 'todo', 'question', 'approval', 'artifact', 'evidence', 'subagent', 'notice', 'error',
])

export function isKnownType(type: string): type is EventType {
  return TYPES.has(type)
}

export function isKnownKind(kind: string | undefined): kind is ItemKind {
  return kind !== undefined && KINDS.has(kind)
}

/** Kiểm tối thiểu một đối tượng nhận từ mạng có phải phong bì sự kiện v1 không. */
export function parseEvent(raw: unknown): UiEvent | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const e = raw as Record<string, unknown>
  if (e['v'] !== PROTOCOL_VERSION || typeof e['event_id'] !== 'string' || typeof e['type'] !== 'string') return undefined
  if (typeof e['seq'] !== 'number' && e['type'] !== 'stream.reset') return undefined
  return raw as UiEvent
}
