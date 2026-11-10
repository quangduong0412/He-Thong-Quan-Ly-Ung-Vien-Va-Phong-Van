import type { ReactNode } from 'react'
import type { ApprovalPreviewProps, ResultProps } from '@assistant/extension-sdk'

// Dữ liệu từ MCP mHiring và kết quả task là dữ liệu không tin cậy: chỉ hiển thị dạng text, liên kết chỉ nhận http(s).

/** Thực thể liên quan theo hợp đồng mHiring: mã, hoặc {id|code, label}. */
type Ref = string | { id?: string; code?: string; label?: string } | undefined

export const refLabel = (value: Ref): string =>
  typeof value === 'string' ? value : value?.label ?? value?.code ?? value?.id ?? ''

const safeUrl = (url: unknown): string | undefined =>
  typeof url === 'string' && /^https?:\/\//i.test(url) ? url : undefined

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase()

interface Candidate {
  id?: string
  label?: string
  url?: string
  stage?: Ref
  skills?: string[]
  applications?: { job?: Ref; stage?: Ref }[]
}

/** Thẻ kết quả tool mhiring__get_candidate. */
export function CandidateCard({ result, conversation }: ResultProps): ReactNode {
  const c = (result ?? {}) as Candidate
  if (!c.label) return null
  const job = refLabel(c.applications?.[0]?.job)
  const url = safeUrl(c.url)
  return (
    <div className="mh-card">
      <div className="mh-avatar" aria-hidden="true">{initials(c.label)}</div>
      <div className="mh-card-body">
        <strong>{c.label}</strong>
        <small>{[refLabel(c.stage), job && `vị trí ${job}`].filter(Boolean).join(' · ')}</small>
        <div className="mh-skills">{(c.skills ?? []).slice(0, 8).map(s => <span key={s} className="chip">{s}</span>)}</div>
      </div>
      <div className="mh-actions">
        {url ? <a className="btn small" href={url} target="_blank" rel="noopener noreferrer">Mở trên mHiring</a> : null}
        <button type="button" className="btn small" onClick={() => conversation.send(`Đặt lịch phỏng vấn cho ${c.label}${c.id ? ` (${c.id})` : ''}`)}>Đặt lịch</button>
      </div>
    </div>
  )
}

interface Scoring { Criterion: string; CriterionTitle?: string; Score: number; Summary?: string; IsError?: boolean }

/** Thẻ kết quả task hr.cv.score (dùng như tool task__hr_cv_score): điểm 0-10 theo từng tiêu chí. */
export function CvScoreCard({ result }: ResultProps): ReactNode {
  const output = ((result ?? {}) as { output?: { Scoring?: Scoring[] } }).output
  const rows = output?.Scoring ?? []
  if (rows.length === 0) return null
  return (
    <div className="mh-scores">
      {rows.map(s => (
        <div key={s.Criterion} className="mh-score" title={s.Summary}>
          <span>{s.CriterionTitle || s.Criterion}{s.IsError ? ' ⚠' : ''}</span>
          <div className="bar"><i style={{ width: `${Math.max(0, Math.min(10, s.Score)) * 10}%` }} /></div>
          <b>{s.Score}/10</b>
        </div>
      ))}
    </div>
  )
}

/** Xem trước mhiring__update_candidate_stage: ứng viên → giai đoạn đích (mã theo get_metadata của tenant). */
export function StageChangePreview({ args, edited }: ApprovalPreviewProps): ReactNode {
  const value = (key: string) => edited?.[key] ?? args[key]
  const candidate = String(args['candidate_id'] ?? '?')
  return (
    <div className="mh-preview">
      <div className="who">
        <span className="mh-avatar sm" aria-hidden="true">{candidate.slice(-2).toUpperCase()}</span>
        <div><strong>Ứng viên {candidate}</strong><small>mHiring · chuyển giai đoạn</small></div>
      </div>
      <div className="flow"><span aria-hidden="true">→</span><span className={`chip hot${edited?.['stage'] ? ' edited' : ''}`}>{String(value('stage') ?? '')}</span></div>
      {value('reason_code') ? <p className="note">Lý do: {String(value('reason_code'))}</p> : null}
      {value('note') ? <p className="note">Ghi chú: {String(value('note'))}</p> : null}
    </div>
  )
}

const when = (iso: unknown): string => {
  const date = typeof iso === 'string' ? new Date(iso) : null
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : String(iso ?? '')
}

const MODE: Record<string, string> = { onsite: 'Trực tiếp', online: 'Trực tuyến', phone: 'Điện thoại' }

/** Xem trước mhiring__schedule_interview. */
export function InterviewBookingPreview({ args, edited }: ApprovalPreviewProps): ReactNode {
  const value = (key: string) => edited?.[key] ?? args[key]
  const interviewers = value('interviewer_ids')
  const mode = String(value('mode') ?? '')
  return (
    <div className="mh-preview">
      <div className="who"><strong>{String(value('title') ?? 'Phỏng vấn')}</strong></div>
      <table className="arg-table"><tbody>
        <tr><th>Ứng viên</th><td>{String(value('candidate_id') ?? '')}</td></tr>
        <tr><th>Người phỏng vấn</th><td>{Array.isArray(interviewers) ? interviewers.join(', ') : String(interviewers ?? '')}</td></tr>
        <tr><th>Thời gian</th><td>{when(value('start'))}{value('duration_minutes') ? ` · ${String(value('duration_minutes'))} phút` : ''}</td></tr>
        {mode ? <tr><th>Hình thức</th><td>{MODE[mode] ?? mode}{value('location') ? ` · ${String(value('location'))}` : ''}</td></tr> : null}
      </tbody></table>
      <p className="note">{value('notify_candidate') === false ? 'mHiring tạo lịch, không gửi lời mời cho ứng viên.' : 'mHiring tạo lịch và gửi lời mời theo cấu hình của doanh nghiệp.'}</p>
    </div>
  )
}
