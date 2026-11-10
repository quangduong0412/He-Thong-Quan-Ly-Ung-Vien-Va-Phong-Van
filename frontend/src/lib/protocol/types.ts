// Kiểu REST lấy từ OpenAPI (docs/api/assistant-openapi.yaml → generated/api.ts); sự kiện UI v1 viết tay ở events.ts
// vì OpenAPI chỉ mô tả phong bì chung, còn payload phụ thuộc type + item_kind.
import type { components, operations } from './generated/api'

type S = components['schemas']

export type Config = S['Config']
export type User = S['User']
export type AssistantInfo = S['AssistantInfo']
export type CommandInfo = S['CommandInfo']
export type ConversationSummary = S['ConversationSummary']
export type ConversationDetail = S['ConversationDetail']
export type CreateConversation = S['CreateConversation']
export type UpdateConversation = S['UpdateConversation']
export type PageContext = S['PageContext']
export type SendMessage = S['SendMessage']
export type TurnAccepted = S['TurnAccepted']
export type Answer = S['Answer']
export type ApprovalDecision = S['ApprovalDecision']
export type FileRef = S['FileRef']
export type UploadTarget = S['UploadTarget']
export type QuestionSpec = S['QuestionSpec']
export type ArtifactType = S['ArtifactType']
export type ArtifactSummary = S['ArtifactSummary']
export type Artifact = S['Artifact']
export type ArtifactVersionInfo = S['ArtifactVersionInfo']
export type ArtifactVersion = S['ArtifactVersion']
export type ArtifactDiff = S['ArtifactDiff']
export type Reminder = S['Reminder']
/** Chi tiết nguồn tham khảo (GET /sources/{collection}/{item_id}): trường tuỳ kho (tin TopCV: description, requirements, benefits…). */
export interface SourceDetail {
  collection: string
  id: string
  title?: string
  source?: string
  kind?: string
  link?: string
  [field: string]: unknown
}
export type Problem = S['Problem']
export type ItemKind = S['ItemKind']
export type Usage = { input_tokens: number; output_tokens: number; duration_ms: number }
export type ItemState = components['schemas']['ItemState']

// Quản trị doanh nghiệp (admin tenant): thu hẹp chính sách trong gói, chặn người dùng, mức dùng, nhật ký
export type TenantLimits = S['TenantLimits']
export type TenantAdminOverview = S['TenantAdminOverview']
export type TenantUserUsage = S['TenantUserUsage']
export type BlockState = S['BlockState']
type AuditRaw = operations['tenantAdminAudit']['responses'][200]['content']['application/json']['items'][number]
/** Một thao tác của admin tenant; `at` là giây unix. */
export type TenantAuditEntry = Omit<AuditRaw, 'detail'> & { detail?: Record<string, unknown> | null }
