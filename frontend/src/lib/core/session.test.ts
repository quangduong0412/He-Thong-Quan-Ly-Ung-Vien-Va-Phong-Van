import { describe, expect, it } from 'vitest'
import { sessionChanged, throttleCheck, watchSessionOnFocus } from './session'

const cfg = (id: string, tenant?: string) => ({ user: { id, roles: [], ...(tenant ? { tenant } : {}) } })

describe('phát hiện đổi phiên', () => {
  it('so người dùng và tenant', () => {
    expect(sessionChanged(cfg('u1', 't1'), cfg('u1', 't1'))).toBe(false)
    expect(sessionChanged(cfg('u1', 't1'), cfg('u1', 't2'))).toBe(true)
    expect(sessionChanged(cfg('u1', 't1'), cfg('u2', 't1'))).toBe(true)
    expect(sessionChanged(cfg('u1'), cfg('u1'))).toBe(false)
  })

  it('throttle: tối đa một lần mỗi khoảng, không chạy chồng', async () => {
    let t = 0
    let calls = 0
    let release: () => void = () => undefined
    const run = throttleCheck(() => { calls += 1; return new Promise<void>(r => { release = r }) }, 30_000, () => t)
    run(); run()
    expect(calls).toBe(1)
    t = 31_000
    run()   // lần trước chưa xong → bỏ qua
    expect(calls).toBe(1)
    release(); await new Promise(r => setTimeout(r, 0))
    run()
    expect(calls).toBe(2)
    t = 40_000
    run()
    expect(calls).toBe(2)
  })

  it('kiểm tra khi focus hoặc tab hiện lại; huỷ theo dõi được', async () => {
    const listeners: Record<string, () => void> = {}
    const target = { addEventListener: (k: string, f: () => void) => { listeners[k] = f }, removeEventListener: (k: string) => { delete listeners[k] } }
    const doc = { ...target, visibilityState: 'hidden' }
    let t = 0
    let calls = 0
    const stop = watchSessionOnFocus(async () => { calls += 1 }, { now: () => t, win: target, doc })
    listeners['visibilitychange']?.()
    expect(calls).toBe(0)   // tab bị ẩn: không kiểm tra
    doc.visibilityState = 'visible'
    listeners['visibilitychange']?.()
    expect(calls).toBe(1)
    await new Promise(r => setTimeout(r, 0))
    listeners['focus']?.()
    expect(calls).toBe(1)   // chưa đủ 30 s
    t = 30_000
    listeners['focus']?.()
    expect(calls).toBe(2)
    stop()
    expect(Object.keys(listeners)).toHaveLength(0)
  })
})
