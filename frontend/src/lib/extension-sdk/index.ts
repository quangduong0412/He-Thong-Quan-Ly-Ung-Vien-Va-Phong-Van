// @assistant/extension-sdk — gói duy nhất đội phân hệ cần import (ví dụ: packages/ext-mhiring).
//
// Quy tắc: extension KHÔNG truy cập token, KHÔNG gọi thẳng Model/Tool Gateway, KHÔNG sửa state lõi. Mọi thao tác ghi đi qua
// hội thoại (ConversationApi.send / hành động artifact) để có xác nhận và audit. Dữ liệu đưa vào renderer là KHÔNG TIN CẬY:
// chỉ hiển thị, không chèn HTML.
import type { ComponentType } from 'react'
import type { Answer, ArtifactSummary, PageContext, QuestionSpec } from '@assistant/protocol'

/** Cửa sổ hẹp để extension tác động lên hội thoại hiện tại. */
export interface ConversationApi {
  conversationId: string | null
  /** Gửi một tin nhắn như người dùng gõ. */
  send(text: string): void
  /** Mở artifact trong panel. */
  openArtifact(artifactId: string, version?: number): void
  /** Chạy hành động nghiệp vụ của kiểu artifact (đi qua approval nếu là hành động ghi). */
  runArtifactAction(artifactId: string, action: string): Promise<void>
  context: PageContext | null
}

export interface ResultProps {
  /** Dữ liệu không tin cậy: chỉ hiển thị. */
  result: unknown
  args?: Record<string, unknown>
  conversation: ConversationApi
}

export interface ResultRenderer {
  match: { renderHint?: string; tool?: string }
  component: ComponentType<ResultProps>
}

export interface SlashCommand {
  name: string
  title: string
  description?: string
  run(args: string, conversation: ConversationApi): void
}

export interface Starter { text: string }

export interface MentionProvider {
  trigger: string                       // "@"
  title: string
  search(query: string, signal: AbortSignal): Promise<{ id: string; label: string; ref: string }[]>
}

export interface ApprovalPreviewProps {
  tool: string
  args: Record<string, unknown>
  edited?: Record<string, unknown>
}

export interface QuestionIntentProps {
  question: QuestionSpec
  value: Answer
  onChange(answer: Answer): void
}

export interface ArtifactViewProps<T = unknown> {
  artifact: ArtifactSummary
  content: T
  /** Đang stream: nội dung có thể chưa đầy đủ (JSON dở dang đã được đóng ngoặc). */
  streaming: boolean
}

export interface ArtifactEditorProps<T = unknown> extends ArtifactViewProps<T> {
  onChange(next: T): void
}

export interface ArtifactDiffProps<T = unknown> {
  from: T
  to: T
}

export interface ArtifactTypeUi<T = unknown> {
  icon?: string
  label?: string
  renderer: ComponentType<ArtifactViewProps<T>>
  editor?: ComponentType<ArtifactEditorProps<T>>
  diff?: ComponentType<ArtifactDiffProps<T>>
  /** Xuất sang văn bản/markdown để sao chép (mặc định JSON). */
  toText?(content: T): string
}

export interface AssistantExtension {
  id: string
  /** Áp dụng cho assistant nào (mặc định: mọi assistant). */
  assistants?: string[]
  renderers?: ResultRenderer[]
  commands?: SlashCommand[]
  starters?: (ctx: PageContext | null) => Starter[]
  mentions?: MentionProvider[]
  contextLabels?: Record<string, (ref: string) => Promise<string>>
  /** Tên hiển thị một bước tool: (args, result) => chuỗi ngắn. */
  toolFormatters?: Record<string, (args: Record<string, unknown>, result: unknown) => string | undefined>
  approvalPreviews?: Record<string, ComponentType<ApprovalPreviewProps>>
  questionIntents?: Record<string, ComponentType<QuestionIntentProps>>
  artifactTypes?: Record<string, ArtifactTypeUi<any>>
}

export function defineExtension(ext: AssistantExtension): AssistantExtension {
  return ext
}
