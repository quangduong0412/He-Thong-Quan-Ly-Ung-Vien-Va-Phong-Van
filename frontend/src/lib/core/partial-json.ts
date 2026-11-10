// Parse JSON đang được stream: đóng chuỗi/mảng/object còn dở rồi parse. Dùng cho artifact kiểu JSON (vd table) để vẽ dần.
export function parsePartialJson(text: string): unknown | undefined {
  const trimmed = text.trim()
  if (!trimmed) return undefined
  try {
    return JSON.parse(trimmed)
  } catch {
    // tiếp tục sửa
  }
  const stack: string[] = []
  let inString = false
  let escape = false
  let lastComma: { at: number; stack: string[] } | undefined
  for (let i = 0; i < trimmed.length; i += 1) {
    const char = trimmed[i]
    if (inString) {
      if (escape) escape = false
      else if (char === '\\') escape = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') inString = true
    else if (char === '{') stack.push('}')
    else if (char === '[') stack.push(']')
    else if (char === '}' || char === ']') stack.pop()
    else if (char === ',') lastComma = { at: i, stack: [...stack] }
  }

  // Cách 1: đóng phần dở tại chỗ
  let out = trimmed
  if (inString) {
    if (escape) out = out.slice(0, -1)                       // dấu \ treo
    out = out.replace(/\\u[0-9a-fA-F]{0,3}$/, '')            // \uXXXX dở
    out += '"'
  }
  out = out.replace(/,\s*$/, '').replace(/:\s*$/, ': null')
  const first = tryParse(out + [...stack].reverse().join(''))
  if (first !== undefined) return first
  // Cách 2: cắt tại dấu phẩy cuối (bỏ khoá/giá trị dở) rồi đóng theo ngăn xếp lúc đó
  if (lastComma) return tryParse(trimmed.slice(0, lastComma.at) + [...lastComma.stack].reverse().join(''))
  return undefined
}

function tryParse(text: string): unknown | undefined {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
