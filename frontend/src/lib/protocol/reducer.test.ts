import { describe, expect, it } from 'vitest'

import { EventBuilder } from './testing'
import { applyAll, applyEvent, hydrate, initialState, prependEarlier } from './reducer'
import { parseSse } from './sse'

function run(events: ReturnType<EventBuilder['events']['slice']>) {
  const { state } = applyAll(initialState(), events)
  return state
}

describe('reducer', () => {
  it('gộp delta thành văn bản và để completed ghi đè bản cuối', () => {
    const b = new EventBuilder()
    b.runStarted().started('answer', 'a1', { provisional: true }).delta('a1', { text: 'Xin ' }).delta('a1', { text: 'chào' })
    expect(run(b.events).items['a1']?.data['text']).toBe('Xin chào')
    b.completed('a1', { text: 'Xin chào bạn' }).runCompleted({ title: 'Chào hỏi' })
    const s = run(b.events)
    expect(s.items['a1']?.data['text']).toBe('Xin chào bạn')
    expect(s.items['a1']?.status).toBe('completed')
    expect(s.title).toBe('Chào hỏi')
    expect(s.activeTurnId).toBeNull()
  })

  it('hạ cấp answer tạm thành commentary', () => {
    const b = new EventBuilder()
    b.runStarted().started('answer', 'a1', { provisional: true }).delta('a1', { text: 'Mình tra hồ sơ…' }).updated('a1', { demoted: true }, 'commentary')
    const item = run(b.events).items['a1']
    expect(item?.kind).toBe('commentary')
    expect(item?.data['text']).toBe('Mình tra hồ sơ…')
  })

  it('bỏ sự kiện trùng và phát hiện khoảng trống', () => {
    const b = new EventBuilder()
    b.runStarted().started('tool', 't1', { title: 'Tra' }).completed('t1', { ok: true })
    const [e1, e2, e3] = b.events as [any, any, any]
    let s = applyEvent(initialState(), e1).state
    expect(applyEvent(s, e1).outcome).toBe('duplicate')
    expect(applyEvent(s, e3).outcome).toBe('gap')
    s = applyEvent(s, e2).state
    expect(applyEvent(s, e3).outcome).toBe('applied')
  })

  it('bỏ sự kiện item có revision cũ (phát lại chồng)', () => {
    const b = new EventBuilder()
    b.runStarted().started('answer', 'a1').delta('a1', { text: 'A' }).delta('a1', { text: 'B' })
    const base = run(b.events)
    const stale = { ...(b.events[2] as any), seq: base.lastSeq + 1 }   // revision 2 đã áp dụng
    const again = applyEvent(base, stale)
    expect(again.state.items['a1']?.data['text']).toBe('AB')
  })

  it('đóng item còn chạy khi lượt kết thúc: question/approval → cancelled, tool → completed', () => {
    const b = new EventBuilder()
    b.runStarted().started('question', 'q1', { question_id: 'q', state: 'open' }).started('approval', 'p1', { approval_id: 'p' }).started('tool', 't1')
      .runCompleted()
    const s = run(b.events)
    expect(s.items['q1']?.status).toBe('cancelled')
    expect(s.items['p1']?.status).toBe('cancelled')
    expect(s.items['t1']?.status).toBe('completed')
  })

  it('run.waiting giữ question/approval ở trạng thái waiting', () => {
    const b = new EventBuilder()
    b.runStarted().started('question', 'q1', { state: 'open' }).updated('q1', { state: 'continued' }).runWaiting([{ kind: 'question', item_id: 'q1' }])
    const s = run(b.events)
    expect(s.items['q1']?.status).toBe('waiting')
    expect(s.items['q1']?.data['state']).toBe('continued')
    expect(s.turns['t_1']?.status).toBe('waiting')
  })

  it('artifact: delta theo trường rồi completed', () => {
    const b = new EventBuilder()
    b.runStarted().started('artifact', 'ar1', { artifact_id: 'a1', artifact_type: 'document', title: 'JD', version: 1, state: 'streaming' })
      .stream('ar1', '# Tiêu đề\nNội dung', 6, 0, 'content').completed('ar1', { version: 1, summary: 'Bản đầu', state: 'ready' })
    const item = run(b.events).items['ar1']
    expect(item?.data['content']).toBe('# Tiêu đề\nNội dung')
    expect(item?.data['version']).toBe(1)
    expect(item?.status).toBe('completed')
  })

  it('bỏ qua type và item_kind lạ mà không lỗi', () => {
    const b = new EventBuilder()
    b.runStarted()
    const unknown = { v: 1 as const, event_id: 'x', seq: 2, ts: 1, type: 'future.thing', turn_id: 't_1', payload: {} }
    const s = applyEvent(run(b.events), unknown)
    expect(s.outcome).toBe('applied')
    const odd = { v: 1 as const, event_id: 'y', seq: 3, ts: 1, type: 'item.started', turn_id: 't_1', item_id: 'z', item_kind: 'hologram' as any, revision: 1, payload: { a: 1 } }
    expect(applyEvent(s.state, odd).state.items['z']?.kind).toBe('hologram')
  })

  it('hydrate từ ConversationDetail rồi nối tiếp bằng sự kiện', () => {
    const state = hydrate({
      conversation: { id: 'c', assistant: 'x', title: 'Tiêu đề', state: 'active', created_at: '', updated_at: '' },
      items: [{ item_id: 'u1', item_kind: 'user', turn_id: 't_0', revision: 1, status: 'completed', seq: 2, data: { text: 'hi' } }],
      last_seq: 5, active_turn: null,
    })
    expect(state.lastSeq).toBe(5)
    expect(applyEvent(state, { v: 1, event_id: 'c:7', seq: 7, ts: 1, type: 'run.started' }).outcome).toBe('gap')
    expect(applyEvent(state, { v: 1, event_id: 'c:6', seq: 6, ts: 1, type: 'run.started', turn_id: 't_1', payload: {} }).outcome).toBe('applied')
  })
})

async function* chunks(parts: string[]) {
  const encoder = new TextEncoder()
  for (const part of parts) yield encoder.encode(part)
}

describe('parseSse', () => {
  it('chịu được chunk cắt giữa dòng, bỏ comment ping', async () => {
    const frames = []
    for await (const f of parseSse(chunks([': ping\n\nid: 1\nevent: item.delta\nda', 'ta: {"a":', '1}\n\nid: 2\ndata: x\r\ndata: y\r\n\r\n']))) frames.push(f)
    expect(frames).toEqual([{ id: '1', event: 'item.delta', data: '{"a":1}' }, { id: '2', data: 'x\ny' }])
  })
})

describe('phân trang theo lượt', () => {
  const item = (id: string, turn: string, seq: number) => ({ item_id: id, item_kind: 'answer' as const, turn_id: turn, parent_item_id: null, revision: 1, status: 'completed' as const, seq, data: { text: id } })
  const detail = (items: ReturnType<typeof item>[], more: boolean, first: number, last = 10) => ({
    conversation: { id: 'c1', title: 'T' }, items, has_more_before: more, first_seq: first, last_seq: last, active_turn: null, artifacts: [],
  }) as unknown as Parameters<typeof hydrate>[0]

  it('hydrate ghi nhớ còn lượt cũ hơn và seq đầu của cửa sổ', () => {
    const state = hydrate(detail([item('a3', 't3', 7), item('a4', 't4', 9)], true, 7))
    expect([state.hasMoreBefore, state.firstSeq, state.turnOrder]).toEqual([true, 7, ['t3', 't4']])
  })

  it('prependEarlier chèn trang cũ lên đầu, không trùng, giữ lastSeq và lượt đang chạy', () => {
    const live = hydrate(detail([item('a3', 't3', 7), item('a4', 't4', 9)], true, 7))
    live.activeTurnId = 't4'
    live.lastSeq = 12
    const merged = prependEarlier(live, detail([item('a1', 't1', 1), item('a2', 't2', 4), item('a3', 't3', 7)], false, 1))
    expect(merged.order).toEqual(['a1', 'a2', 'a3', 'a4'])
    expect(merged.turnOrder).toEqual(['t1', 't2', 't3', 't4'])
    expect([merged.hasMoreBefore, merged.firstSeq, merged.lastSeq, merged.activeTurnId]).toEqual([false, 1, 12, 't4'])
  })
})
