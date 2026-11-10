// Phía SPA của AuthAdapter (kế hoạch mục 5.1). SPA không có màn hình đăng nhập: dùng chung phiên của app chính.
// Cơ chế cụ thể theo từng SaaS sẽ chốt khi tích hợp; hợp đồng ở đây chỉ gồm "gửi gì kèm request" và "làm gì khi 401".
import type { ClientOptions } from '@assistant/protocol'

export interface SpaAuth {
  /** Tuỳ chọn truyền cho ConversationClient (header xác thực, CSRF). */
  clientOptions(): Pick<ClientOptions, 'headers' | 'csrf'>
  /** Gọi khi API trả 401: thường chuyển về trang đăng nhập của app chính kèm địa chỉ quay lại. */
  onUnauthorized(): void
}

/** Adapter `jwt`: token app chính đã có (bộ nhớ, hoặc hàm lấy token từ app chính). */
export function jwtAuth(getToken: () => string | Promise<string>, onUnauthorized: () => void): SpaAuth {
  return {
    clientOptions: () => ({ headers: async () => ({ authorization: `Bearer ${await getToken()}` }) }),
    onUnauthorized,
  }
}

/** Adapter `introspection` / `trusted_header`: cookie HttpOnly cùng origin do trình duyệt tự gửi; chống CSRF bằng header. */
export function cookieAuth(onUnauthorized: () => void): SpaAuth {
  return { clientOptions: () => ({ csrf: true }), onUnauthorized }
}

/** Adapter `dev`: không gửi gì (server dev gán người dùng cố định). Không dùng ở production. */
export function devAuth(): SpaAuth {
  return { clientOptions: () => ({}), onUnauthorized: () => undefined }
}
