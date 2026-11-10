import { describe, expect, it } from 'vitest'
import { ApiError, type ConversationDetail, type UiEvent } from '@assistant/protocol'
import { EventBuilder } from '@assistant/protocol/testing'

import { ExtensionRegistry } from './extensions'
import { selectPending, selectTurns } from './selectors'
import { createAssistantStore, type StoreDeps } from './store'
import type { AssistantApi } from './api'

function detail(over: Partial<ConversationDetail> = {}): ConversationDetail {
  return {
    conversation: { id: 'c1', assistant: 'ats-recruiter', title: 'Hội thoại', state: 'active', created_at: '', updated_at: '' },
    items: [], last_seq: 0, active_turn: null, artifacts: [], ...over,
  }
}

function setup(over: Partial<Record<keyof AssistantApi, any>> = {}, deps: Partial<StoreDeps> = {}) {
  const calls: Record<string, unknown[][]> = {}
  const handlers: { onEvent?: (e: UiEvent) => void; getAfter?: () => number; restarts: number } = { restarts: 0 }
  const rec = (name: string, fn: (...a: any[]) => any) => (...args: any[]) => { (calls[name] ??= []).push(args); return fn(...args) }
  const api = {
    getConfig: rec('getConfig', async () => ({ protocol_version: 1, user: { id: 'u', roles: [] }, assistants: [{ id: 'ats-recruiter', title: 'ATS' }], limits: { max_message_chars: 1000, max_files_per_message: 3, max_file_bytes: 1 } })),
    listConversations: rec('listConversations', async () => ({ items: [] })),
    listArtifactTypes: async () => ({ items: [] }),
    createConversation: rec('createConversation', async () => ({ id: 'c1', assistant: 'ats-recruiter', title: 'Mới', state: 'active', created_at: '', updated_at: '' })),
    getConversation: rec('getConversation', async () => detail()),
    sendMessage: rec('sendMessage', async () => ({ turn_id: 't_1', message_id: 'm1' })),
    cancel: rec('cancel', async () => ({ accepted: true })),
    answerQuestion: rec('answerQuestion', async () => ({ accepted: true, mode: 'in_turn' })),
    decideApproval: rec('decideApproval', async () => ({ accepted: true })),
    getArtifact: rec('getArtifact', async () => ({ id: 'a1', type: 'document', title: 'JD', current_version: 1, updated_at: '', content: '# JD' })),
    listArtifactVersions: rec('listArtifactVersions', async () => ({ items: [{ artifact_id: 'a1', version: 1, author: 'agent', created_at: '' }] })),
    openStream: (_id: string, o: any) => {
      handlers.onEvent = o.onEvent
      handlers.getAfter = o.getAfter
      return { start() {}, stop() {}, restart() { handlers.restarts += 1 } }
    },
    ...over,
  } as unknown as AssistantApi
  const store = createAssistantStore({ api, registry: new ExtensionRegistry([]), uuid: () => 'client-1', schedule: f => f(), ...deps })
  return { store, calls, handlers }
}

describe('store', () => {
  it('mở hội thoại: hydrate rồi áp dụng sự kiện stream và dựng lượt', async () => {
    const { store, handlers } = setup()
    await store.getState().init()
    await store.getState().openConversation('c1')
    const b = new EventBuilder({ conversation: 'c1' })
    b.runStarted().started('user', 'u1', {}).completed('u1', { text: 'Xin chào', message_id: 'm1' }).started('answer', 'a1', { provisional: true }).delta('a1', { text: 'Chào bạn' }).completed('a1', { text: 'Chào bạn', message_id: 'm2' }).runCompleted({ title: 'Chào hỏi' })
    for (const e of b.events) handlers.onEvent?.(e)
    const turns = selectTurns(store.getState().conv)
    expect(turns).toHaveLength(1)
    expect(turns[0]?.user?.data['text']).toBe('Xin chào')
    expect(turns[0]?.answer?.data['text']).toBe('Chào bạn')
    expect(store.getState().conv.title).toBe('Chào hỏi')
  })

  it('gửi tin ở hội thoại mới: tạo hội thoại, mở stream, gửi với client_message_id', async () => {
    const { store, calls } = setup()
    await store.getState().init()
    await store.getState().send('  Tóm tắt ứng viên  ')
    expect(calls['createConversation']).toHaveLength(1)
    expect((calls['sendMessage']?.[0] as any)[1]).toMatchObject({ client_message_id: 'client-1', text: 'Tóm tắt ứng viên' })
    expect(store.getState().currentId).toBe('c1')
    expect(store.getState().optimistic?.text).toBe('Tóm tắt ứng viên')
  })

  it('lỗi 409 conversation_busy: giữ lại nội dung đã gõ và báo nhẹ', async () => {
    const { store } = setup({ sendMessage: async () => { throw new ApiError(409, { code: 'conversation_busy', message: 'busy' }) } })
    await store.getState().init()
    await store.getState().openConversation('c1')
    await store.getState().send('Tin của tôi')
    expect(store.getState().optimistic).toBeNull()
    expect(store.getState().drafts['c1']).toBe('Tin của tôi')
    expect(store.getState().banner?.code).toBe('conversation_busy')
  })

  it('khoảng trống seq → tải lại trạng thái và nối lại stream', async () => {
    const { store, handlers, calls } = setup()
    await store.getState().init()
    await store.getState().openConversation('c1')
    const b = new EventBuilder({ conversation: 'c1' }).runStarted().started('tool', 't1', {}).completed('t1', {})
    handlers.onEvent?.(b.events[0] as UiEvent)
    handlers.onEvent?.(b.events[2] as UiEvent)    // thiếu seq 2
    await new Promise(r => setTimeout(r, 0))
    expect(calls['getConversation']?.length).toBe(2)
    expect(handlers.restarts).toBe(1)
  })

  it('artifact: panel mở ngay khi bắt đầu viết, tải nội dung khi xong', async () => {
    const { store, handlers, calls } = setup()
    await store.getState().init()
    await store.getState().openConversation('c1')
    const b = new EventBuilder({ conversation: 'c1' }).runStarted()
      .started('artifact', 'ar1', { artifact_id: 'a1', artifact_type: 'document', title: 'JD', version: 1, state: 'streaming' })
    for (const e of b.events) handlers.onEvent?.(e)
    expect(store.getState().panel).toMatchObject({ open: true, artifactId: 'a1' })
    b.completed('ar1', { version: 1 })
    handlers.onEvent?.(b.events.at(-1) as UiEvent)
    await new Promise(r => setTimeout(r, 0))
    expect(calls['getArtifact']).toHaveLength(1)
    expect(store.getState().artifacts['a1']?.contents[1]).toBe('# JD')
  })

  it('câu hỏi đang chờ được chọn bởi selectPending và trả lời qua API', async () => {
    const { store, handlers, calls } = setup()
    await store.getState().init()
    await store.getState().openConversation('c1')
    const b = new EventBuilder({ conversation: 'c1' }).runStarted()
      .started('question', 'q1', { question_id: 'qq', state: 'open', questions: [{ id: 'q', question: 'Vị trí nào?' }] })
    for (const e of b.events) handlers.onEvent?.(e)
    const pending = selectPending(store.getState().conv)
    expect(pending?.id).toBe('q1')
    await store.getState().answerQuestion(pending!, [{ id: 'q', selected: ['Backend'] }])
    expect(calls['answerQuestion']?.[0]).toEqual(['c1', 'qq', [{ id: 'q', selected: ['Backend'] }]])
  })

  it('danh sách hội thoại: tải thêm theo cursor, làm mới giữ số đã tải, tìm phía server', async () => {
    const all = Array.from({ length: 75 }, (_, i) => ({ id: `c${i}`, assistant: 'ats-recruiter', title: `H${i}`, state: 'active', created_at: '', updated_at: '' }))
    const list = async (q: { cursor?: string; limit?: number; q?: string }) => {
      const source = q.q ? all.filter(c => c.title.includes(q.q as string)) : all
      const start = q.cursor ? Number(q.cursor) : 0
      const limit = q.limit ?? 30
      return { items: source.slice(start, start + limit), next_cursor: start + limit < source.length ? String(start + limit) : null }
    }
    const { store } = setup({ listConversations: list })
    await store.getState().init()
    expect(store.getState().conversations).toHaveLength(30)
    expect(store.getState().listCursor).toBe('30')
    await store.getState().loadMoreConversations()
    await store.getState().loadMoreConversations()
    expect(store.getState().conversations.map(c => c.id)).toEqual(all.map(c => c.id))
    expect(store.getState().listCursor).toBeNull()
    await store.getState().loadMoreConversations()                       // hết trang: không gọi thêm
    expect(store.getState().conversations).toHaveLength(75)
    await store.getState().refreshList()                                 // làm mới sau lượt chạy: không mất phần đã cuộn
    expect(store.getState().conversations).toHaveLength(75)
    await store.getState().refreshList('H7')
    expect(store.getState().conversations.map(c => c.title)).toEqual(['H7', 'H70', 'H71', 'H72', 'H73', 'H74'])
    expect(store.getState().listQuery).toBe('H7')
  })

  it('403 user_blocked ở bất kỳ API nào → trang chặn thay giao diện chat', async () => {
    const { store } = setup({ listConversations: async () => { throw new ApiError(403, { code: 'user_blocked', message: 'blocked' }) } })
    await store.getState().init()
    expect(store.getState().fatal?.code).toBe('user_blocked')
    expect(store.getState().fatal?.message).toContain('Quản trị viên doanh nghiệp đã tạm ngừng quyền dùng trợ lý của bạn')
  })

  it('401 → onUnauthorized; reportError trả câu báo lỗi của server', async () => {
    let unauthorized = 0
    const { store } = setup({}, { onUnauthorized: () => { unauthorized += 1 } })
    expect(store.getState().reportError(new ApiError(401, { code: 'unauthorized', message: 'Hết phiên' }))).toBe('Hết phiên')
    expect(unauthorized).toBe(1)
    expect(store.getState().reportError(new ApiError(422, { code: 'invalid_request', message: 'Vượt mức gói' }))).toBe('Vượt mức gói')
    expect(store.getState().reportError(new Error('x'), 'Lỗi chung')).toBe('Lỗi chung')
    expect(unauthorized).toBe(1)
  })

  it('kiểm tra lại phiên: cùng người dùng/tenant → giữ; khác → onSessionChanged; 401 → onUnauthorized', async () => {
    let user = { id: 'u', roles: [], tenant: 't1' }
    let status = 200
    let changed = 0
    let unauthorized = 0
    const { store } = setup({
      getConfig: async () => {
        if (status === 401) throw new ApiError(401, { code: 'unauthorized', message: 'x' })
        return { protocol_version: 1, user, assistants: [{ id: 'ats-recruiter', title: 'ATS' }], limits: { max_message_chars: 1, max_files_per_message: 1, max_file_bytes: 1 } }
      },
    }, { onSessionChanged: () => { changed += 1 }, onUnauthorized: () => { unauthorized += 1 } })
    await store.getState().init()
    expect(await store.getState().revalidateSession()).toBe('same')
    user = { ...user, tenant: 't2' }
    expect(await store.getState().revalidateSession()).toBe('changed')
    user = { id: 'other', roles: [], tenant: 't1' }
    expect(await store.getState().revalidateSession()).toBe('changed')
    expect(changed).toBe(2)
    status = 401
    expect(await store.getState().revalidateSession()).toBe('error')
    expect(unauthorized).toBe(1)
    expect(store.getState().banner).toBeNull()
  })

  it('đang bị chặn từ lúc khởi động: kiểm tra lại thấy /config trả 200 (đã bỏ chặn) → onSessionChanged', async () => {
    let blocked = true
    let changed = 0
    const { store } = setup({
      getConfig: async () => {
        if (blocked) throw new ApiError(403, { code: 'user_blocked', message: 'x' })
        return { protocol_version: 1, user: { id: 'u', roles: [] }, assistants: [], limits: { max_message_chars: 1, max_files_per_message: 1, max_file_bytes: 1 } }
      },
    }, { onSessionChanged: () => { changed += 1 } })
    await store.getState().init()
    expect(store.getState().fatal?.code).toBe('user_blocked')
    expect(await store.getState().revalidateSession()).toBe('error')
    blocked = false
    expect(await store.getState().revalidateSession()).toBe('changed')
    expect(changed).toBe(1)
  })

  it('xem nguồn tham khảo: tải chi tiết qua API; 404 → báo tại chỗ, không làm hỏng hội thoại', async () => {
    const detail = { collection: 'topcv-jd', id: 'x1', title: 'Senior Java', source: 'TopCV', description: '• Thiết kế backend' }
    const { store, calls } = setup({
      getSource: async (collection: string, id: string) => {
        (calls['getSource'] ??= []).push([collection, id])
        if (id === 'missing') throw new ApiError(404, { code: 'not_found', message: 'Không tìm thấy' })
        return detail
      },
    })
    await store.getState().init()
    await store.getState().openSource('topcv-jd', 'x1', 'Tạm')
    expect(calls['getSource']).toEqual([['topcv-jd', 'x1']])
    expect(store.getState().source).toMatchObject({ loading: false, title: 'Senior Java', detail, error: null })
    await store.getState().openSource('topcv-jd', 'missing')
    expect(store.getState().source).toMatchObject({ loading: false, detail: null, error: 'Nguồn này không còn hoặc không thuộc kho được dùng.' })
    expect(store.getState().fatal).toBeNull()
    store.getState().closeSource()
    expect(store.getState().source).toBeNull()
  })
})
