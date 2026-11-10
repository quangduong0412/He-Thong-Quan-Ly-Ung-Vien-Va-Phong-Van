import { describe, expect, it, vi } from 'vitest'
import mhiring from './index'
import { refLabel } from './cards'

describe('ext-mhiring', () => {
  it('chỉ gắn với trợ lý tuyển dụng và tool mhiring__*', () => {
    expect(mhiring.assistants).toEqual(['hr-recruiter'])
    expect(mhiring.renderers?.map(r => r.match)).toEqual([{ tool: 'mhiring__get_candidate' }, { renderHint: 'task:hr.cv.score' }])
    expect(Object.keys(mhiring.approvalPreviews ?? {})).toEqual(['mhiring__update_candidate_stage', 'mhiring__schedule_interview'])
  })

  it('gợi ý theo trang đang mở bên mHiring, không có ngữ cảnh thì để gợi ý của trợ lý', () => {
    const texts = (ref: string | null) => mhiring.starters?.(ref ? { ref } : null).map(s => s.text) ?? []
    expect(texts('mhiring.candidate:c-101')).toContain('Tóm tắt ứng viên này')
    expect(texts('mhiring.job:j-7')).toContain('Thống kê pipeline của vị trí này')
    expect(texts(null)).toEqual([])
  })

  it('tên hiển thị tiến trình lấy từ kết quả, thiếu thì dùng mã', () => {
    const f = mhiring.toolFormatters ?? {}
    expect(f['mhiring__get_candidate']?.({ candidate_id: 'c-1' }, { label: 'Nguyễn Văn An' })).toBe('Nguyễn Văn An')
    expect(f['mhiring__get_candidate']?.({ candidate_id: 'c-1' }, undefined)).toBe('c-1')
    expect(f['mhiring__find_interviewer_slots']?.({}, { slots: [{}, {}] })).toBe('2 khung giờ trống')
    expect(f['mhiring__search_candidates']?.({}, {})).toBeUndefined()
  })

  it('lệnh gạch chéo gửi câu yêu cầu tương ứng', () => {
    const send = vi.fn()
    const conversation = { send } as never
    mhiring.commands?.find(c => c.name === 'lich')?.run('Trần Bình', conversation)
    expect(send).toHaveBeenCalledWith('Đặt lịch phỏng vấn cho Trần Bình')
  })

  it('nhãn thực thể theo hợp đồng: mã hoặc {id|code, label}', () => {
    expect(refLabel('screening')).toBe('screening')
    expect(refLabel({ code: 'interview', label: 'Phỏng vấn' })).toBe('Phỏng vấn')
    expect(refLabel({ id: 'j-7' })).toBe('j-7')
    expect(refLabel(undefined)).toBe('')
  })
})
