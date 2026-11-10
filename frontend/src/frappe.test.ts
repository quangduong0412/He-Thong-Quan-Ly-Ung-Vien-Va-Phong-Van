import { afterEach, describe, expect, it } from 'vitest'
import { ConversationClient } from '@assistant/protocol'
import { GATEWAY_URL, csrfHeaders, getClientConfig, loginUrl, safeReturn } from './frappe'

const g = globalThis as { window?: Partial<Window> }
afterEach(() => { delete g.window })

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('điểm nối Frappe', () => {
  it('gửi X-Frappe-CSRF-Token khi có token của phiên, bỏ qua placeholder jinja chưa render', async () => {
    g.window = { csrf_token: 'abc123' }
    expect(await csrfHeaders()).toEqual({ 'X-Frappe-CSRF-Token': 'abc123' })
    g.window = {}
    expect(await csrfHeaders()).toEqual({})
  })

  it('đăng nhập lại quay về đúng trang đang xem', () => {
    expect(loginUrl({ pathname: '/mbw_assistant_mhiring/c/c1', search: '?ctx=a:b' }))
      .toBe('/login?redirect-to=%2Fmbw_assistant_mhiring%2Fc%2Fc1%3Fctx%3Da%3Ab')
  })

  it('chỉ nhận đường dẫn quay lại tương đối cùng origin (chống open redirect)', () => {
    expect(safeReturn('/mbw_ats/candidate/1')).toBe('/mbw_ats/candidate/1')
    for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', '/a b', null, ''])
      expect(safeReturn(bad)).toBeNull()
  })

  it('đọc cấu hình client từ Frappe; lỗi mạng hoặc HTTP → null', async () => {
    const config = { api_base: GATEWAY_URL, assistant_id: 'hr-recruiter', has_access: true, provisioned: false }
    expect(await getClientConfig(async () => json({ message: config }))).toEqual(config)
    expect(await getClientConfig(async () => json({ exc_type: 'PermissionError' }, 403))).toBeNull()
    expect(await getClientConfig(async () => { throw new TypeError('offline') })).toBeNull()
  })

  it('client gọi Assistant API qua gateway của Frappe, request ghi mang CSRF', async () => {
    g.window = { csrf_token: 'tok' }
    const calls: { url: string; init: RequestInit }[] = []
    const fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return json({ id: 'c1', title: 'x' })
    }) as typeof globalThis.fetch
    const api = new ConversationClient({ baseUrl: GATEWAY_URL, headers: csrfHeaders, fetch })
    await api.updateConversation('c 1/x', { title: 't' })
    expect(calls[0]?.url).toBe('/api/method/mbw_assistant_mhiring.api.assistant.gateway/conversations/c%201%2Fx')
    expect(calls[0]?.init.method).toBe('PATCH')
    expect((calls[0]?.init.headers as Record<string, string>)['X-Frappe-CSRF-Token']).toBe('tok')
    expect(calls[0]?.init.credentials).toBe('same-origin')
  })
})
