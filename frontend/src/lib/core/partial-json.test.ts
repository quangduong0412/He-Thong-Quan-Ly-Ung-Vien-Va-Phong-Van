import { describe, expect, it } from 'vitest'

import { parsePartialJson } from './partial-json'

describe('parsePartialJson', () => {
  const full = JSON.stringify({ title: 'Backend "Senior"', sections: [{ heading: 'Yêu cầu', items: ['Python', 'SQL'] }], salary: { min: 20, max: 40 }, ok: true })

  it('parse đầy đủ như JSON.parse', () => {
    expect(parsePartialJson(full)).toEqual(JSON.parse(full))
  })

  it('mọi tiền tố đều cho kết quả là object (hoặc undefined ở đầu) và không ném lỗi', () => {
    let last: any
    for (let i = 1; i <= full.length; i += 1) {
      const value = parsePartialJson(full.slice(0, i))
      if (value !== undefined) { expect(typeof value).toBe('object'); last = value }
    }
    expect(last).toEqual(JSON.parse(full))
  })

  it('đóng chuỗi dở và giữ phần đã viết', () => {
    expect(parsePartialJson('{"title":"Backend Sen')).toEqual({ title: 'Backend Sen' })
    expect(parsePartialJson('{"title":"A","items":["x","y')).toEqual({ title: 'A', items: ['x', 'y'] })
  })

  it('bỏ khoá chưa có giá trị', () => {
    expect(parsePartialJson('{"title":"A","sal')).toEqual({ title: 'A' })
    expect(parsePartialJson('{"title":"A","salary":')).toEqual({ title: 'A', salary: null })
  })
})
