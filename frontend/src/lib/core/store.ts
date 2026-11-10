// Store của Assistant (zustand vanilla). Một nguồn sự thật cho giao diện: danh sách hội thoại, state hội thoại đang mở (dựng bằng
// reducer của @assistant/protocol), kết nối stream, panel artifact. Không phụ thuộc React (hook ở react.tsx).
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  ApiError, applyEvent, hydrate, initialState, prependEarlier,
  type Answer, type ApprovalDecision, type ArtifactSummary, type ArtifactType, type ArtifactVersionInfo, type Config, type ConversationState,
  type ConversationSummary, type FileRef, type Item, type PageContext, type Reminder, type SourceDetail, type StreamStatus, type UiEvent,
} from '@assistant/protocol'
import type { AssistantApi } from './api'
import type { ExtensionRegistry } from './extensions'
import { sessionChanged } from './session'

export interface ArtifactEntry {
  summary: ArtifactSummary
  versions: ArtifactVersionInfo[]
  /** nội dung theo phiên bản đã tải */
  contents: Record<number, unknown>
  loading: boolean
}

export interface PanelState {
  open: boolean
  artifactId: string | null
  /** null = phiên bản hiện tại */
  version: number | null
  /** so sánh với phiên bản này (null = không so sánh) */
  compareWith: number | null
  mode: 'view' | 'edit' | 'source'
}

/** Thông báo chiếm cả trang thay cho giao diện chat (người dùng bị chặn, không làm mới được phiên…). */
export interface FatalNotice {
  code: string
  title: string
  message: string
  /** Liên kết hành động (vd đăng nhập lại); `target: '_top'` khi đang nhúng để thoát khỏi iframe. */
  action?: { label: string; href: string; target?: '_top' | '_self' }
}

/** Server trả 403 code `user_blocked` cho mọi API khi admin doanh nghiệp đã chặn người dùng. */
/** Số hội thoại mỗi trang ở thanh bên; khi làm mới giữ tối đa LIST_MAX_PAGE (giới hạn của API). */
export const LIST_PAGE = 30
export const LIST_MAX_PAGE = 100

export const USER_BLOCKED_NOTICE: FatalNotice = {
  code: 'user_blocked',
  title: 'Tạm ngừng quyền dùng trợ lý',
  message: 'Quản trị viên doanh nghiệp đã tạm ngừng quyền dùng trợ lý của bạn. Liên hệ quản trị viên doanh nghiệp nếu bạn cần dùng lại.',
}

export interface Banner { level: 'info' | 'warning' | 'error'; code: string; message: string; retry?: () => void }

/** Nguồn tham khảo đang xem (bấm trích dẫn / "Xem nội dung"). */
export interface SourceView { collection: string; id: string; title: string | null; loading: boolean; detail: SourceDetail | null; error: string | null }

export interface AssistantStore {
  config: Config | null
  conversations: ConversationSummary[]
  listLoading: boolean
  /** cursor trang hội thoại tiếp theo; null = đã tải hết */
  listCursor: string | null
  /** từ khoá tìm hội thoại đang áp (tìm phía server, cả tiêu đề và nội dung) */
  listQuery: string
  currentId: string | null
  assistant: string | null
  /** Model/chế độ người dùng chọn cho các tin sắp gửi; null = mặc định của assistant */
  choice: { model: string | null; preset: string | null }
  context: PageContext | null
  conv: ConversationState
  loading: boolean
  connection: StreamStatus | 'idle'
  /** tin vừa gửi, chưa thấy item user tương ứng từ server */
  optimistic: { clientId: string; text: string; files: { id: string; name: string; size: number }[] } | null
  banner: Banner | null
  /** khác null: thay toàn bộ giao diện bằng thông báo này */
  fatal: FatalNotice | null
  drafts: Record<string, string>
  attachments: FileRef[]
  artifacts: Record<string, ArtifactEntry>
  artifactTypes: Record<string, ArtifactType>
  panel: PanelState
  feedback: Record<string, 'up' | 'down'>
  /** nhắc việc đang chờ của người dùng (rỗng nếu backend không bật) */
  reminders: Reminder[]
  source: SourceView | null

  init(opts?: { assistant?: string; context?: PageContext | null }): Promise<void>
  /** Tải lại danh sách hội thoại (q: đổi từ khoá tìm; bỏ trống = giữ từ khoá hiện tại), giữ số lượng đã tải. */
  refreshList(q?: string): Promise<void>
  /** Tải trang hội thoại tiếp theo (cuộn tới cuối danh sách). */
  loadMoreConversations(): Promise<void>
  openConversation(id: string | null): Promise<void>
  /** Tải trang lượt cũ hơn của hội thoại đang mở (phân trang theo lượt). */
  loadEarlier(): Promise<void>
  selectAssistant(id: string): void
  setModel(ref: string | null): void
  setPreset(id: string | null): void
  send(text: string, opts?: { command?: string }): Promise<void>
  cancel(): Promise<void>
  answerQuestion(item: Item, answers: Answer[]): Promise<void>
  decideApproval(item: Item, decision: ApprovalDecision): Promise<void>
  setDraft(text: string): void
  attachFile(file: File): Promise<void>
  removeAttachment(id: string): void
  setFeedback(messageId: string, rating: 'up' | 'down' | 'none'): Promise<void>
  renameConversation(id: string, title: string): Promise<void>
  pinConversation(id: string, pinned: boolean): Promise<void>
  archiveConversation(id: string): Promise<void>
  deleteConversation(id: string): Promise<void>
  dismissBanner(): void
  setFatal(notice: FatalNotice | null): void
  /** Xử lý lỗi API chung (401 → hết phiên, user_blocked → trang chặn) rồi trả câu báo lỗi để hiển thị tại chỗ. */
  reportError(error: unknown, fallback?: string): string
  /** Kiểm tra lại /config (khi quay lại tab): đổi người dùng/tenant, hoặc vừa được bỏ chặn → gọi deps.onSessionChanged. */
  revalidateSession(): Promise<'same' | 'changed' | 'error'>
  refreshReminders(): Promise<void>
  createReminder(body: Parameters<AssistantApi['createReminder']>[0]): Promise<boolean>
  cancelReminder(id: string): Promise<void>
  openSource(collection: string, id: string, title?: string | null): Promise<void>
  closeSource(): void

  openArtifact(id: string, version?: number | null): Promise<void>
  closePanel(): void
  setPanel(patch: Partial<PanelState>): void
  ensureVersion(id: string, version: number): Promise<unknown>
  saveArtifact(id: string, content: unknown, summary?: string): Promise<void>
  restoreArtifact(id: string, version: number): Promise<void>
  exportArtifact(id: string, format: string): Promise<{ url: string; filename: string }>
  runArtifactAction(id: string, action: string): Promise<void>
  dispose(): void
}

export interface StoreDeps {
  api: AssistantApi
  registry: ExtensionRegistry
  uuid?: () => string
  /** Ghi đè lịch gộp sự kiện (test dùng đồng bộ). */
  schedule?: (flush: () => void) => void
  onUnauthorized?: () => void
  /** /config trả người dùng hoặc tenant khác lúc khởi động (SaaS đổi tenant, người khác đăng nhập): thường là tải lại trang. */
  onSessionChanged?: () => void
}

const defaultUuid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `m_${Date.now()}_${Math.random().toString(16).slice(2)}`)
const defaultSchedule = (flush: () => void) => { setTimeout(flush, 16) }

const CLOSED_PANEL: PanelState = { open: false, artifactId: null, version: null, compareWith: null, mode: 'view' }

/** Artifact mới cập nhật gần nhất của hội thoại hiện tại (undefined nếu chưa có). */
export function latestArtifactId(artifacts: Record<string, ArtifactEntry>): string | undefined {
  let best: string | undefined
  for (const [id, entry] of Object.entries(artifacts)) {
    if (best === undefined || String(entry.summary.updated_at ?? '') >= String(artifacts[best]?.summary.updated_at ?? '')) best = id
  }
  return best
}

export function createAssistantStore(deps: StoreDeps): StoreApi<AssistantStore> {
  const { api } = deps
  const uuid = deps.uuid ?? defaultUuid
  const schedule = deps.schedule ?? defaultSchedule

  let stream: ReturnType<AssistantApi['openStream']> | undefined
  let queue: UiEvent[] = []
  let flushing = false
  let resyncing = false
  let epoch = 0   // đổi mỗi lần mở hội thoại để bỏ kết quả bất đồng bộ của hội thoại cũ

  const store = createStore<AssistantStore>()((set, get) => {
    const report = (error: unknown, fallback = 'Có lỗi xảy ra, thử lại sau.'): string => {
      if (!(error instanceof ApiError)) return fallback
      if (error.status === 401) deps.onUnauthorized?.()
      if (error.code === 'user_blocked') set({ fatal: USER_BLOCKED_NOTICE })
      return error.message || fallback
    }
    const fail = (error: unknown, fallback = 'Có lỗi xảy ra, thử lại sau.'): void => {
      const message = report(error, fallback)
      set({ banner: { level: 'error', code: error instanceof ApiError ? error.code : 'client_error', message } })
    }

    const stopStream = () => {
      stream?.stop()
      stream = undefined
      queue = []
      set({ connection: 'idle' })
    }

    const startStream = (id: string) => {
      stream = api.openStream(id, {
        getAfter: () => get().conv.lastSeq,
        onEvent: event => { queue.push(event); if (!flushing) { flushing = true; schedule(flush) } },
        onStatus: (status, info) => {
          set({ connection: status })
          if (status === 'fatal' && info?.status === 401) deps.onUnauthorized?.()
        },
      })
      stream.start()
    }

    const loadArtifact = async (id: string, force = false): Promise<void> => {
      const known = get().artifacts[id]
      if (known && !force && !known.loading && known.versions.length > 0) return
      set(s => ({ artifacts: { ...s.artifacts, [id]: { summary: known?.summary ?? ({ id, type: 'document', title: '…', current_version: 1, updated_at: '' } as ArtifactSummary), versions: known?.versions ?? [], contents: known?.contents ?? {}, loading: true } } }))
      try {
        const [artifact, versions] = await Promise.all([api.getArtifact(id), api.listArtifactVersions(id)])
        const { content, ...summary } = artifact as typeof artifact & { content: unknown }
        set(s => ({ artifacts: { ...s.artifacts, [id]: { summary: summary as ArtifactSummary, versions: versions.items, contents: { ...s.artifacts[id]?.contents, [artifact.current_version]: content }, loading: false } } }))
      } catch (error) {
        set(s => ({ artifacts: { ...s.artifacts, [id]: { ...(s.artifacts[id] as ArtifactEntry), loading: false } } }))
        fail(error)
      }
    }

    const afterApplied = (event: UiEvent): void => {
      const payload = (event.payload ?? {}) as Record<string, any>
      if (event.item_kind === 'artifact') {
        const artifactId = (payload['artifact_id'] ?? get().conv.items[event.item_id ?? '']?.data['artifact_id']) as string | undefined
        if (event.type === 'item.started' && artifactId) {
          // panel mở ngay khi model bắt đầu viết
          set({ panel: { open: true, artifactId, version: null, compareWith: null, mode: 'view' } })
        }
        if ((event.type === 'item.completed' || event.type === 'item.failed') && artifactId) void loadArtifact(artifactId, true)
      }
      if (event.type === 'run.completed' || event.type === 'run.failed' || event.type === 'run.cancelled' || event.type === 'run.waiting') { void get().refreshList(); void get().refreshReminders() }
      if (event.type === 'item.completed' && event.item_kind === 'user') set({ optimistic: null })
    }

    const resync = async (): Promise<void> => {
      const id = get().currentId
      if (!id || resyncing) return
      resyncing = true
      const mine = epoch
      try {
        const detail = await api.getConversation(id)
        if (mine !== epoch) return
        set({ conv: hydrate(detail), optimistic: null })
        stream?.restart()
      } catch (error) {
        fail(error)
      } finally {
        resyncing = false
      }
    }

    function flush(): void {
      flushing = false
      const batch = queue
      queue = []
      if (batch.length === 0) return
      let conv = get().conv
      let needResync = false
      const applied: UiEvent[] = []
      for (const event of batch) {
        const result = applyEvent(conv, event)
        if (result.outcome === 'applied') { conv = result.state; applied.push(event) }
        else if (result.outcome === 'gap' || result.outcome === 'reset') { needResync = true; break }
      }
      if (applied.length > 0) {
        set({ conv })
        for (const event of applied) afterApplied(event)
      }
      if (needResync) void resync()
    }

    return {
      config: null,
      conversations: [],
      listLoading: false,
      listCursor: null,
      listQuery: '',
      currentId: null,
      assistant: null,
      choice: { model: null, preset: null },
      context: null,
      conv: initialState(),
      loading: false,
      connection: 'idle',
      optimistic: null,
      banner: null,
      fatal: null,
      drafts: {},
      attachments: [],
      artifacts: {},
      artifactTypes: {},
      panel: CLOSED_PANEL,
      feedback: {},
      source: null,
      reminders: [],

      async init(opts = {}) {
        try {
          const config = await api.getConfig()
          const assistant = opts.assistant && config.assistants.some(a => a.id === opts.assistant) ? opts.assistant : config.assistants[0]?.id ?? null
          set({ config, assistant, context: opts.context ?? null })
          void api.listArtifactTypes().then(r => set({ artifactTypes: Object.fromEntries(r.items.map(t => [t.type, t])) })).catch(() => undefined)
          await get().refreshList()
          void get().refreshReminders()
        } catch (error) {
          fail(error, 'Không tải được cấu hình Assistant.')
        }
      },

      async refreshReminders() {
        if (!get().config?.features?.reminders) { if (get().reminders.length) set({ reminders: [] }); return }
        try {
          set({ reminders: (await api.listReminders({ state: 'active' })).items })
        } catch {
          // nhắc việc là tính năng phụ: lỗi không làm hỏng giao diện chat
        }
      },

      async createReminder(body) {
        try {
          await api.createReminder(body)
          await get().refreshReminders()
          return true
        } catch (error) {
          set({ banner: { level: 'warning', code: error instanceof ApiError ? error.code : 'reminder_failed', message: error instanceof ApiError ? error.message : 'Không hẹn được nhắc việc.' } })
          return false
        }
      },

      async cancelReminder(id) {
        try {
          await api.cancelReminder(id)
        } catch (error) {
          fail(error, 'Không huỷ được nhắc việc.')
        }
        await get().refreshReminders()
      },

      async refreshList(q) {
        const query = (q ?? get().listQuery).trim()
        const same = query === get().listQuery
        const loaded = same ? get().conversations : []
        // Giữ số hội thoại đã tải (người dùng đã cuộn xuống) khi làm mới, tối đa một trang lớn của API
        const limit = Math.min(LIST_MAX_PAGE, Math.max(LIST_PAGE, loaded.length))
        set({ listLoading: true, listQuery: query })
        try {
          const list = await api.listConversations({ limit, ...(query ? { q: query } : {}) })
          if (get().listQuery !== query) return              // từ khoá đã đổi trong lúc chờ
          let items = list.items
          let cursor = list.next_cursor ?? null
          if (loaded.length > limit) {                        // đã tải nhiều hơn một trang lớn: nối phần đuôi cũ, giữ cursor cũ
            const fresh = new Set(items.map(c => c.id))
            items = [...items, ...loaded.slice(limit).filter(c => !fresh.has(c.id))]
            cursor = get().listCursor
          }
          set({ conversations: items, listCursor: cursor, listLoading: false })
        } catch (error) {
          set({ listLoading: false })
          fail(error)
        }
      },

      async loadMoreConversations() {
        const { listCursor: cursor, listQuery: query, listLoading } = get()
        if (!cursor || listLoading) return
        set({ listLoading: true })
        try {
          const page = await api.listConversations({ cursor, limit: LIST_PAGE, ...(query ? { q: query } : {}) })
          if (get().listQuery !== query || get().listCursor !== cursor) { set({ listLoading: false }); return }
          const have = new Set(get().conversations.map(c => c.id))
          set(s => ({ conversations: [...s.conversations, ...page.items.filter(c => !have.has(c.id))],
                      listCursor: page.next_cursor ?? null, listLoading: false }))
        } catch (error) {
          set({ listLoading: false })
          fail(error)
        }
      },

      async openConversation(id) {
        epoch += 1
        const mine = epoch
        stopStream()
        const previous = get().artifacts
        // Tài liệu và panel thuộc về hội thoại: sang hội thoại khác (hoặc hội thoại mới) thì bỏ hết của hội thoại cũ
        set({ currentId: id, conv: initialState(), optimistic: null, banner: null, source: null, panel: CLOSED_PANEL, artifacts: {}, attachments: [], loading: id !== null, choice: { model: null, preset: null } })
        if (id === null) return
        try {
          const detail = await api.getConversation(id)
          if (mine !== epoch) return
          const conv = hydrate(detail)
          // Chỉ giữ artifact của hội thoại này (nội dung đã tải của chính chúng thì dùng lại)
          const artifacts: Record<string, ArtifactEntry> = {}
          for (const summary of detail.artifacts ?? []) artifacts[summary.id] = { summary, versions: previous[summary.id]?.versions ?? [], contents: previous[summary.id]?.contents ?? {}, loading: false }
          set({ conv, artifacts, loading: false, assistant: detail.conversation.assistant, choice: { model: detail.conversation.model ?? null, preset: detail.conversation.preset ?? null } })
          startStream(id)
          // Panel theo hội thoại: mở lại tài liệu mới nhất của hội thoại (màn hình hẹp: panel phủ kín nên để người dùng tự mở)
          const latest = latestArtifactId(artifacts)
          if (latest && typeof window !== 'undefined' && window.innerWidth > 1100) void get().openArtifact(latest)
        } catch (error) {
          if (mine === epoch) set({ loading: false })
          fail(error)
        }
      },

      async loadEarlier() {
        const { currentId, conv } = get()
        if (!currentId || !conv.hasMoreBefore || !conv.firstSeq) return
        const mine = epoch
        try {
          const detail = await api.getConversation(currentId, { before_seq: conv.firstSeq, limit: 30 })
          if (mine !== epoch || get().currentId !== currentId) return
          const artifacts = { ...get().artifacts }
          for (const summary of detail.artifacts ?? []) artifacts[summary.id] ??= { summary, versions: [], contents: {}, loading: false }
          set(s => ({ conv: prependEarlier(s.conv, detail), artifacts }))
        } catch (error) {
          fail(error, 'Không tải được các tin cũ hơn.')
        }
      },

      selectAssistant(id) {
        if (!get().currentId) set({ assistant: id, choice: { model: null, preset: null } })
      },

      setModel(ref) { set(s => ({ choice: { ...s.choice, model: ref } })) },
      setPreset(id) { set(s => ({ choice: { ...s.choice, preset: id } })) },

      async send(text, opts = {}) {
        const state = get()
        const trimmed = text.trim()
        if (!trimmed || !state.assistant) return
        let id = state.currentId
        const clientId = uuid()
        const files = state.attachments.map(f => ({ id: f.id, name: f.name, size: f.size }))
        set({ banner: null, optimistic: { clientId, text: trimmed, files }, drafts: { ...state.drafts, [id ?? '']: '' }, attachments: [] })
        try {
          if (id === null) {
            const created = await api.createConversation({ assistant: state.assistant, ...(state.context ? { context: state.context } : {}) })
            id = created.id
            epoch += 1
            set({ currentId: id, conv: initialState(), artifacts: {}, panel: CLOSED_PANEL, conversations: [created, ...get().conversations] })
            startStream(id)
          }
          await api.sendMessage(id, {
            client_message_id: clientId, text: trimmed, ...(files.length ? { file_ids: files.map(f => f.id) } : {}),
            ...(state.context ? { context: state.context } : {}), ...(opts.command ? { command: opts.command } : {}),
            ...(state.choice.model ? { model: state.choice.model } : {}), ...(state.choice.preset ? { preset: state.choice.preset } : {}),
          })
        } catch (error) {
          set({ optimistic: null, drafts: { ...get().drafts, [id ?? '']: trimmed } })
          if (error instanceof ApiError && error.code === 'conversation_busy') {
            set({ banner: { level: 'warning', code: error.code, message: 'Trợ lý đang trả lời. Đợi xong hoặc bấm Dừng rồi gửi lại.' } })
          } else if (error instanceof ApiError && (error.code === 'quota_exceeded' || error.code === 'rate_limited')) {
            set({ banner: { level: 'error', code: error.code, message: error.message, retry: () => void get().send(trimmed, opts) } })
          } else fail(error, 'Không gửi được tin nhắn.')
        }
      },

      async cancel() {
        const id = get().currentId
        if (!id) return
        try { await api.cancel(id) } catch (error) { fail(error) }
      },

      async answerQuestion(item, answers) {
        const id = get().currentId
        const questionId = item.data['question_id'] as string | undefined
        if (!id || !questionId) return
        try {
          await api.answerQuestion(id, questionId, answers)
        } catch (error) {
          fail(error, 'Không gửi được câu trả lời.')
        }
      },

      async decideApproval(item, decision) {
        const id = get().currentId
        const approvalId = item.data['approval_id'] as string | undefined
        if (!id || !approvalId) return
        try {
          await api.decideApproval(id, approvalId, decision)
        } catch (error) {
          if (error instanceof ApiError && error.code === 'approval_expired') set({ banner: { level: 'warning', code: error.code, message: 'Yêu cầu xác nhận đã hết hạn. Nhờ trợ lý đề xuất lại.' } })
          else fail(error, 'Không gửi được quyết định.')
        }
      },

      setDraft(text) {
        set(s => ({ drafts: { ...s.drafts, [s.currentId ?? '']: text } }))
      },

      async attachFile(file) {
        const limits = get().config?.limits
        if (limits && file.size > limits.max_file_bytes) {
          set({ banner: { level: 'warning', code: 'file_too_large', message: `${file.name} vượt quá ${Math.round(limits.max_file_bytes / 1048576)} MB.` } })
          return
        }
        if (limits && get().attachments.length >= limits.max_files_per_message) {
          set({ banner: { level: 'warning', code: 'too_many_files', message: `Tối đa ${limits.max_files_per_message} file mỗi tin nhắn.` } })
          return
        }
        try {
          // Hiện file "đang tải" ngay, thay bằng FileRef thật khi POST /files xong (upload một bước qua API)
          const pendingId = `pending_${uuid()}`
          set(s => ({ attachments: [...s.attachments, { id: pendingId, name: file.name, size: file.size, status: 'pending' }] }))
          const ready = await api.uploadFile(file)
          set(s => ({ attachments: s.attachments.map(f => (f.id === pendingId ? ready : f)) }))
        } catch (error) {
          set(s => ({ attachments: s.attachments.filter(f => f.status !== 'pending') }))
          fail(error, `Không tải được file ${file.name}.`)
        }
      },

      removeAttachment(id) {
        set(s => ({ attachments: s.attachments.filter(f => f.id !== id) }))
      },

      async setFeedback(messageId, rating) {
        const previous = get().feedback
        set({ feedback: rating === 'none' ? Object.fromEntries(Object.entries(previous).filter(([k]) => k !== messageId)) as Record<string, 'up' | 'down'> : { ...previous, [messageId]: rating } })
        try { await api.setFeedback(messageId, rating) } catch (error) { set({ feedback: previous }); fail(error) }
      },

      async renameConversation(id, title) {
        try {
          const updated = await api.updateConversation(id, { title })
          set(s => ({ conversations: s.conversations.map(c => (c.id === id ? updated : c)) }))
        } catch (error) { fail(error) }
      },

      async pinConversation(id, pinned) {
        try {
          const updated = await api.updateConversation(id, { pinned })
          set(s => ({ conversations: s.conversations.map(c => (c.id === id ? updated : c)) }))
        } catch (error) { fail(error) }
      },

      async archiveConversation(id) {
        try {
          await api.updateConversation(id, { state: 'archived' })
          set(s => ({ conversations: s.conversations.filter(c => c.id !== id) }))
          if (get().currentId === id) await get().openConversation(null)
        } catch (error) { fail(error) }
      },

      async deleteConversation(id) {
        try {
          await api.deleteConversation(id)
          set(s => ({ conversations: s.conversations.filter(c => c.id !== id) }))
          if (get().currentId === id) await get().openConversation(null)
        } catch (error) { fail(error) }
      },

      dismissBanner() {
        set({ banner: null })
      },

      async openSource(collection, id, title = null) {
        set({ source: { collection, id, title, loading: true, detail: null, error: null } })
        try {
          const detail = await api.getSource(collection, id)
          if (get().source?.id === id) set({ source: { collection, id, title: detail.title ?? title, loading: false, detail, error: null } })
        } catch (error) {
          const message = error instanceof ApiError && error.status === 404 ? 'Nguồn này không còn hoặc không thuộc kho được dùng.' : get().reportError(error, 'Không tải được nguồn tham khảo.')
          if (get().source?.id === id) set({ source: { collection, id, title, loading: false, detail: null, error: message } })
        }
      },

      closeSource() {
        set({ source: null })
      },

      setFatal(notice) {
        set({ fatal: notice })
      },

      reportError(error, fallback) {
        return report(error, fallback)
      },

      async revalidateSession() {
        const before = get().config
        // Đang ở trang "bị chặn": admin bỏ chặn thì /config lại trả 200 → tải lại để dùng tiếp
        const blocked = get().fatal?.code === 'user_blocked'
        if (!before && !blocked) return 'error'
        try {
          const after = await api.getConfig()
          if (!blocked && before && !sessionChanged(before, after)) return 'same'
          deps.onSessionChanged?.()
          return 'changed'
        } catch (error) {
          report(error)   // 401 → luồng hết phiên; lỗi mạng thoáng qua thì im lặng
          return 'error'
        }
      },

      async openArtifact(id, version = null) {
        set({ panel: { open: true, artifactId: id, version, compareWith: null, mode: 'view' } })
        await loadArtifact(id)
      },

      closePanel() {
        set({ panel: CLOSED_PANEL })
      },

      setPanel(patch) {
        set(s => ({ panel: { ...s.panel, ...patch } }))
      },

      async ensureVersion(id, version) {
        const entry = get().artifacts[id]
        if (entry && version in entry.contents) return entry.contents[version]
        const result = await api.getArtifactVersion(id, version)
        const content = (result as { content: unknown }).content
        set(s => {
          const current = s.artifacts[id]
          if (!current) return s
          return { artifacts: { ...s.artifacts, [id]: { ...current, contents: { ...current.contents, [version]: content } } } }
        })
        return content
      },

      async saveArtifact(id, content, summary) {
        const entry = get().artifacts[id]
        if (!entry) return
        try {
          await api.saveArtifact(id, entry.summary.current_version, content, summary)
          await loadArtifact(id, true)
          set(s => ({ panel: { ...s.panel, mode: 'view', version: null } }))
        } catch (error) {
          if (error instanceof ApiError && error.code === 'version_conflict') {
            set({ banner: { level: 'warning', code: error.code, message: 'Trợ lý vừa cập nhật tài liệu. Tải phiên bản mới nhất rồi sửa lại.' } })
            await loadArtifact(id, true)
          } else fail(error)
        }
      },

      async restoreArtifact(id, version) {
        try {
          await api.restoreArtifact(id, version)
          await loadArtifact(id, true)
          set(s => ({ panel: { ...s.panel, version: null, compareWith: null } }))
        } catch (error) { fail(error) }
      },

      async exportArtifact(id, format) {
        const result = await api.exportArtifact(id, format)
        return { url: result.url, filename: result.filename }
      },

      async runArtifactAction(id, action) {
        try { await api.runArtifactAction(id, action) } catch (error) { fail(error) }
      },

      dispose() {
        epoch += 1
        stopStream()
      },
    }
  })
  return store
}
