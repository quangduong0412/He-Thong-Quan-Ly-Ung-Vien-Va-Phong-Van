import { defineExtension } from '@assistant/extension-sdk'
import './mhiring.css'
import { CandidateCard, CvScoreCard, InterviewBookingPreview, StageChangePreview, refLabel } from './cards'

const count = (result: unknown, key: string, unit: string) => {
  const n = ((result ?? {}) as Record<string, unknown[] | undefined>)[key]?.length
  return n === undefined ? undefined : `${n} ${unit}`
}
const label = (result: unknown) => refLabel((result ?? undefined) as { label?: string } | undefined) || undefined

interface JdOutput { skill?: { hardSkills?: unknown[]; softSkills?: unknown[] }; competencies?: unknown[]; sources?: { source?: string }[] }

/** Kết quả task hr.jd.generate: "12 kỹ năng cứng · 5 kỹ năng mềm · tham khảo TopCV, Singapore Skills Framework". */
export function jdSummary(result: unknown): string | undefined {
  const output = ((result ?? {}) as { output?: JdOutput }).output
  if (!output) return undefined
  const parts = [
    count(output.skill, 'hardSkills', 'kỹ năng cứng'),
    count(output.skill, 'softSkills', 'kỹ năng mềm'),
    count(output, 'competencies', 'năng lực'),
  ].filter(Boolean)
  const sources = [...new Set((output.sources ?? []).map(s => s.source).filter(Boolean))]
  if (sources.length) parts.push(`tham khảo ${sources.join(', ')}`)
  return parts.join(' · ') || undefined
}

// Trợ lý tuyển dụng (config/assistants/hr-recruiter.yml) với tool mhiring__* theo hợp đồng contracts/mcp/mhiring.yml.
export default defineExtension({
  id: 'mhiring',
  assistants: ['hr-recruiter'],
  renderers: [
    { match: { tool: 'mhiring__get_candidate' }, component: CandidateCard },
    { match: { renderHint: 'task:hr.cv.score' }, component: CvScoreCard },
  ],
  approvalPreviews: {
    mhiring__update_candidate_stage: StageChangePreview,
    mhiring__schedule_interview: InterviewBookingPreview,
  },
  toolFormatters: {
    mhiring__get_candidate: (args, result) => label(result) ?? String(args['candidate_id'] ?? ''),
    mhiring__get_job: (args, result) => label(result) ?? String(args['job_id'] ?? ''),
    mhiring__search_candidates: (_args, result) => count(result, 'items', 'ứng viên'),
    mhiring__search_jobs: (_args, result) => count(result, 'items', 'vị trí'),
    mhiring__find_interviewer_slots: (_args, result) => count(result, 'slots', 'khung giờ trống'),
    task__hr_jd_generate: (_args, result) => jdSummary(result),
  },
  commands: [
    { name: 'jd', title: 'Viết JD', description: '/jd <vị trí>', run: (args, c) => c.send(`Viết JD cho vị trí ${args || 'mới'}`) },
    { name: 'tomtat', title: 'Tóm tắt ứng viên', description: '/tomtat <ứng viên>', run: (args, c) => c.send(`Tóm tắt ứng viên ${args || 'đang xem'}`) },
    { name: 'lich', title: 'Đặt lịch phỏng vấn', description: '/lich <ứng viên>', run: (args, c) => c.send(`Đặt lịch phỏng vấn cho ${args || 'ứng viên đang xem'}`) },
  ],
  // Mở từ trang ứng viên hoặc vị trí của mHiring (?ctx=mhiring.candidate:<mã> | mhiring.job:<mã>)
  starters: ctx => {
    if (ctx?.ref.startsWith('mhiring.candidate:')) {
      return [{ text: 'Tóm tắt ứng viên này' }, { text: 'Chấm CV ứng viên này theo JD vị trí ứng tuyển' }, { text: 'Đặt lịch phỏng vấn cho ứng viên này' }]
    }
    if (ctx?.ref.startsWith('mhiring.job:')) {
      return [{ text: 'Thống kê pipeline của vị trí này' }, { text: 'Ứng viên nào phù hợp nhất cho vị trí này?' }, { text: 'Viết bài đăng tuyển dụng cho vị trí này' }]
    }
    return []
  },
  contextLabels: {
    'mhiring.candidate': async ref => `Ứng viên ${ref.split(':')[1] ?? ''}`,
    'mhiring.job': async ref => `Vị trí ${ref.split(':')[1] ?? ''}`,
  },
})
