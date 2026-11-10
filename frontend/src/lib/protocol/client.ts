// Client Conversation API (docs/api/assistant-openapi.yaml). Không phụ thuộc React; xác thực do adapter của SPA cấp qua `headers`.
import type {
  Answer, ApprovalDecision, Artifact, ArtifactDiff, ArtifactSummary, ArtifactType, ArtifactVersion, ArtifactVersionInfo, Config,
  ConversationDetail, ConversationSummary, CreateConversation, FileRef, Problem, Reminder, SendMessage, SourceDetail,
  TurnAccepted, UpdateConversation, UploadTarget,
} from './types'
import { EventStream, type EventStreamOptions } from './sse'

export class ApiError extends Error {
  constructor(readonly status: number, readonly problem: Problem) {
    super(problem.message)
  }

  get code(): string {
    return this.problem.code
  }
}

export interface ClientOptions {
  baseUrl?: string
  fetch?: typeof fetch
  /** Header xác thực (Authorization: Bearer … với adapter jwt). Cookie cùng origin do trình duyệt tự gửi. */
  headers?: () => HeadersInit | Promise<HeadersInit>
  /** Adapter dùng cookie: gửi X-Assistant-Csrf trên request ghi. */
  csrf?: boolean
}

type Json = Record<string, unknown> | unknown[]

export class ConversationClient {
  readonly baseUrl: string
  #opts: ClientOptions

  constructor(opts: ClientOptions = {}) {
    this.#opts = opts
    this.baseUrl = opts.baseUrl ?? '/assistant/api/v1'
  }

  async #request<T>(method: string, path: string, body?: Json): Promise<T> {
    const doFetch = this.#opts.fetch ?? fetch
    const write = method !== 'GET'
    const response = await doFetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(write && this.#opts.csrf ? { 'x-assistant-csrf': '1' } : {}),
        ...(this.#opts.headers ? await this.#opts.headers() : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    })
    if (response.status === 204) return undefined as T
    const payload: unknown = await response.json().catch(() => undefined)
    if (!response.ok) {
      const problem = (payload as Problem | undefined)?.code ? (payload as Problem) : { code: `http_${response.status}`, message: `Lỗi ${response.status}` }
      throw new ApiError(response.status, problem)
    }
    return payload as T
  }

  getConfig = () => this.#request<Config>('GET', '/config')
  listConversations = (q: { cursor?: string; limit?: number; q?: string; state?: 'active' | 'archived'; assistant?: string } = {}) => {
    const params = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    return this.#request<{ items: ConversationSummary[]; next_cursor?: string | null }>('GET', `/conversations${params.size ? `?${params}` : ''}`)
  }
  createConversation = (body: CreateConversation) => this.#request<ConversationSummary>('POST', '/conversations', body)
  getConversation = (id: string, q: { before_seq?: number; limit?: number } = {}) => {
    const params = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    return this.#request<ConversationDetail>('GET', `/conversations/${enc(id)}${params.size ? `?${params}` : ''}`)
  }
  updateConversation = (id: string, body: UpdateConversation) => this.#request<ConversationSummary>('PATCH', `/conversations/${enc(id)}`, body)
  deleteConversation = (id: string) => this.#request<void>('DELETE', `/conversations/${enc(id)}`)

  listReminders = (q: { conversation_id?: string; state?: 'active' | 'done' | 'cancelled' | 'all' } = {}) => {
    const params = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    return this.#request<{ items: Reminder[] }>('GET', `/reminders${params.size ? `?${params}` : ''}`)
  }
  createReminder = (body: { conversation_id: string; text: string; at?: string; after_seconds?: number; daily_at?: string; weekly?: { weekday: number; time: string }; max_runs?: number }) =>
    this.#request<Reminder>('POST', '/reminders', body)
  cancelReminder = (id: string) => this.#request<void>('DELETE', `/reminders/${enc(id)}`)

  /** Nguồn tham khảo trợ lý trích dẫn (item evidence, link /assistant/sources/{collection}/{id} trong câu trả lời). */
  getSource = (collection: string, id: string) => this.#request<SourceDetail>('GET', `/sources/${enc(collection)}/${enc(id)}`)

  /** Bắt đầu lượt; sự kiện đọc qua openStream(after_seq). */
  sendMessage = (id: string, body: SendMessage) => this.#request<TurnAccepted>('POST', `/conversations/${enc(id)}/messages`, body)
  cancel = (id: string) => this.#request<{ accepted: boolean }>('POST', `/conversations/${enc(id)}/cancel`, {})
  answerQuestion = (id: string, questionId: string, answers: Answer[]) =>
    this.#request<{ accepted: boolean; mode: 'in_turn' | 'late_reply'; turn_id?: string | null }>('POST', `/conversations/${enc(id)}/questions/${enc(questionId)}/answer`, { answers })
  decideApproval = (id: string, approvalId: string, decision: ApprovalDecision) =>
    this.#request<{ accepted: boolean }>('POST', `/conversations/${enc(id)}/approvals/${enc(approvalId)}/decision`, decision)
  setFeedback = (messageId: string, rating: 'up' | 'down' | 'none', reason?: string) =>
    this.#request<void>('PUT', `/messages/${enc(messageId)}/feedback`, { rating, ...(reason ? { reason } : {}) })

  /** Upload một bước qua API (multipart `file`), trả FileRef sẵn sàng để gửi trong file_ids. */
  uploadFile = async (file: Blob & { name?: string }): Promise<FileRef> => {
    const form = new FormData()
    form.append('file', file, file.name ?? 'upload.bin')
    const doFetch = this.#opts.fetch ?? fetch
    const response = await doFetch(`${this.baseUrl}/files`, {
      method: 'POST', body: form, credentials: 'same-origin',
      headers: { accept: 'application/json', ...(this.#opts.csrf ? { 'x-assistant-csrf': '1' } : {}), ...(this.#opts.headers ? await this.#opts.headers() : {}) },
    })
    const payload: unknown = await response.json().catch(() => undefined)
    if (!response.ok) {
      throw new ApiError(response.status, (payload as Problem | undefined)?.code ? (payload as Problem) : { code: `http_${response.status}`, message: `Lỗi ${response.status}` })
    }
    return payload as FileRef
  }
  createUpload = (name: string, contentType?: string) => this.#request<UploadTarget>('POST', '/files/uploads', { name, ...(contentType ? { content_type: contentType } : {}) })
  completeUpload = (fileId: string) => this.#request<FileRef>('POST', `/files/${enc(fileId)}/complete`, {})

  listArtifactTypes = () => this.#request<{ items: ArtifactType[] }>('GET', '/artifact-types')
  listArtifacts = (conversationId: string) => this.#request<{ items: ArtifactSummary[] }>('GET', `/conversations/${enc(conversationId)}/artifacts`)
  getArtifact = (id: string) => this.#request<Artifact>('GET', `/artifacts/${enc(id)}`)
  listArtifactVersions = (id: string) => this.#request<{ items: ArtifactVersionInfo[] }>('GET', `/artifacts/${enc(id)}/versions`)
  getArtifactVersion = (id: string, version: number) => this.#request<ArtifactVersion>('GET', `/artifacts/${enc(id)}/versions/${version}`)
  saveArtifact = (id: string, baseVersion: number, content: unknown, summary?: string) =>
    this.#request<ArtifactVersionInfo>('POST', `/artifacts/${enc(id)}/versions`, { base_version: baseVersion, content, ...(summary ? { summary } : {}) } as Json)
  restoreArtifact = (id: string, version: number) => this.#request<ArtifactVersionInfo>('POST', `/artifacts/${enc(id)}/restore`, { version })
  diffArtifact = (id: string, from: number, to: number) => this.#request<ArtifactDiff>('GET', `/artifacts/${enc(id)}/diff?from=${from}&to=${to}`)
  exportArtifact = (id: string, format: string, version?: number) =>
    this.#request<{ url: string; expires_at: string; filename: string }>('POST', `/artifacts/${enc(id)}/export`, { format, ...(version ? { version } : {}) })
  renderArtifact = (id: string, version?: number) =>
    this.#request<{ url: string; expires_at: string }>('POST', `/artifacts/${enc(id)}/render`, version ? { version } : {})
  runArtifactAction = (id: string, action: string, version?: number) =>
    this.#request<TurnAccepted>('POST', `/artifacts/${enc(id)}/actions/${enc(action)}`, version ? { version } : {})

  /** Stream sự kiện của hội thoại; truyền getAfter để nối lại từ seq đã áp dụng. */
  openStream(conversationId: string, o: Pick<EventStreamOptions, 'getAfter' | 'onEvent' | 'onStatus'> & Partial<EventStreamOptions>): EventStream {
    return new EventStream({
      fetch: this.#opts.fetch, headers: this.#opts.headers,
      url: after => `${this.baseUrl}/conversations/${enc(conversationId)}/stream?after=${after}`,
      idleTimeoutMs: 45_000,
      ...o,
    })
  }
}

const enc = encodeURIComponent
