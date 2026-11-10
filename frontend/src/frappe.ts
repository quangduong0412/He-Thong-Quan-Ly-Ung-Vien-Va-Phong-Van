// Điểm nối giao diện Trợ lý với Frappe: thay cho config.ts (biến VITE_*) và server/proxy.mjs của ui-assistant.
// Không có URL nền tảng AI, khoá hay biến môi trường nào ở đây: backend Frappe giữ cấu hình (AI Settings) và khoá (User Key).

/** Assistant API đi qua backend Frappe (mbw_assistant_mhiring/api/assistant.py). */
export const GATEWAY_URL = '/api/method/mbw_assistant_mhiring.api.assistant.gateway'

/** Đường dẫn gốc của app trong Frappe (website_route_rules trong hooks.py). */
export const BASENAME = '/mbw_assistant_mhiring'

export interface ClientConfig {
  api_base: string
  assistant_id: string
  has_access: boolean
  provisioned: boolean
}

let devToken: Promise<string | undefined> | undefined

/** Token CSRF của phiên: jinja gắn vào trang; khi `yarn dev` (trang chưa qua jinja) thì hỏi bench một lần. */
async function csrfToken(): Promise<string | undefined> {
  const token = typeof window !== 'undefined' ? window.csrf_token : undefined
  if (token && !token.startsWith('{{')) return token
  if (!import.meta.env?.DEV) return undefined
  devToken ??= fetch('/api/method/mbw_assistant_mhiring.www.mbw_assistant_mhiring.get_context_for_dev', { credentials: 'same-origin' })
    .then(r => (r.ok ? r.json() : null))
    .then((body: { message?: { csrf_token?: string } } | null) => body?.message?.csrf_token)
    .catch(() => undefined)
  return devToken
}

/** Frappe kiểm X-Frappe-CSRF-Token cho mọi request ghi (POST/PUT/PATCH/DELETE) của phiên đăng nhập. */
export async function csrfHeaders(): Promise<Record<string, string>> {
  const token = await csrfToken()
  return token ? { 'X-Frappe-CSRF-Token': token } : {}
}

/** Cấu hình không bí mật (trợ lý mặc định, người dùng đã được cấp quyền/khoá chưa). null nếu không lấy được. */
export async function getClientConfig(doFetch: typeof fetch = fetch): Promise<ClientConfig | null> {
  try {
    const response = await doFetch('/api/method/mbw_assistant_mhiring.api.assistant.get_client_config', {
      credentials: 'same-origin', headers: { accept: 'application/json' },
    })
    if (!response.ok) return null
    const body = await response.json() as { message?: ClientConfig }
    return body.message ?? null
  } catch {
    return null
  }
}

/** Trang đăng nhập của Frappe, quay lại đúng chỗ đang xem sau khi đăng nhập. */
export function loginUrl(current: Pick<Location, 'pathname' | 'search'> = window.location): string {
  return `/login?redirect-to=${encodeURIComponent(`${current.pathname}${current.search}`)}`
}

/** Đăng xuất phiên Frappe (POST /api/method/logout, cần X-Frappe-CSRF-Token) rồi chuyển sang màn đăng nhập. */
export async function logout(doFetch: typeof fetch = fetch): Promise<void> {
  try {
    await doFetch('/api/method/logout', { method: 'POST', credentials: 'same-origin', headers: await csrfHeaders() })
  } catch {
    // Mất mạng/API lỗi: vẫn chuyển sang màn đăng nhập, cookie phiên có thể đã hết hạn sẵn
  }
  window.location.href = loginUrl()
}

/** Chỉ cho quay lại đường dẫn tương đối cùng origin (chống open redirect). */
export function safeReturn(value: string | null): string | null {
  return value && /^\/(?![/\\])[^\s\\\u0000-\u001f]*$/.test(value) ? value : null
}
