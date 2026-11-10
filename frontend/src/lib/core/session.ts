// Phát hiện đổi phiên khi quay lại tab: SaaS có thể đã chuyển doanh nghiệp (tenant) hoặc người khác đăng nhập trên cùng trình duyệt
// (cookie assistant_session dùng chung cả domain). Khi cửa sổ được focus/hiện lại (tối đa mỗi 30 s) kiểm tra lại /config;
// khác người dùng hoặc tenant lúc khởi động → tải lại trang. 401 đi theo luồng hết phiên thông thường (store gọi onUnauthorized).
import type { Config } from '@assistant/protocol'

/** Người dùng/tenant của phiên mới khác phiên lúc khởi động. */
export function sessionChanged(before: Pick<Config, 'user'>, after: Pick<Config, 'user'>): boolean {
  return before.user.id !== after.user.id || (before.user.tenant ?? null) !== (after.user.tenant ?? null)
}

/** Bọc hàm kiểm tra: gọi nhiều lần trong `minIntervalMs` chỉ chạy một lần (lần đầu chạy ngay); không chạy chồng. */
export function throttleCheck(check: () => Promise<unknown>, minIntervalMs = 30_000, now: () => number = Date.now): () => void {
  let last = Number.NEGATIVE_INFINITY
  let running = false
  return () => {
    const t = now()
    if (running || t - last < minIntervalMs) return
    last = t
    running = true
    void check().catch(() => undefined).finally(() => { running = false })
  }
}

interface FocusTarget {
  addEventListener(type: string, fn: () => void): void
  removeEventListener(type: string, fn: () => void): void
}

/**
 * Gọi `check` (đã throttle) khi cửa sổ được focus hoặc tab hiện lại. Trả hàm huỷ theo dõi.
 * Mặc định dùng window/document; test truyền đối tượng giả.
 */
export function watchSessionOnFocus(
  check: () => Promise<unknown>,
  opts: { minIntervalMs?: number; now?: () => number; win?: FocusTarget; doc?: FocusTarget & { visibilityState?: string } } = {},
): () => void {
  const win = opts.win ?? (typeof window !== 'undefined' ? window : undefined)
  const doc = opts.doc ?? (typeof document !== 'undefined' ? document : undefined)
  const run = throttleCheck(check, opts.minIntervalMs, opts.now)
  const onVisible = () => { if (!doc || doc.visibilityState === undefined || doc.visibilityState === 'visible') run() }
  win?.addEventListener('focus', run)
  doc?.addEventListener('visibilitychange', onVisible)
  return () => {
    win?.removeEventListener('focus', run)
    doc?.removeEventListener('visibilitychange', onVisible)
  }
}
