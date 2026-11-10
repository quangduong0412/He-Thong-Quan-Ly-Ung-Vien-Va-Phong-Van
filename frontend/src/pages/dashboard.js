"use strict";

/* ---------------------------------------------------------------- DASHBOARD */
PAGES.dashboard = () => {
  const u = currentUser();
  const actions = [
    PERM.scheduleInterview() ? btn('Lên lịch phỏng vấn',{ic:'calendar',action:'openSchedule'}) : '',
    PERM.createRequest() ? btn('Tạo yêu cầu mới',{variant:'primary',ic:'plus',action:'newRequest'}) : '',
  ].join('');
  return `
  ${pageHeader(`Xin chào, ${esc(firstName(u.user))}`, `Tổng quan tuyển dụng hôm nay · ${fmtDateLong(TODAY)} · <strong>${esc(labelVi(state.role))}</strong>`, actions)}
  ${roleBanner()}
  <!-- React component: KpiGrid > StatCard -->
  <section class="kpi-grid" aria-label="Chỉ số chính">${KPIS.map(statCard).join('')}</section>
  <div class="dash-grid mt-5">
    <div class="stack">${pipelineCard()}${upcomingCard()}</div>
    <div class="stack">${tasksCard()}</div>
  </div>
  <div class="mt-5">${approvalsCard()}</div>`;
};
function roleBanner(){
  const msgs = {
    'Interviewer':['info','Bạn có 1 nhận xét phỏng vấn chưa hoàn thành','Nhận xét phỏng vấn của Đặng Thùy Linh (INT-0004) đang chờ bạn. Nhận xét của những người phỏng vấn khác sẽ bị ẩn cho đến khi bạn gửi nhận xét.',btn('Viết nhận xét',{variant:'primary',size:'btn-sm',action:'openFeedback',data:{code:'INT-0004'}})],
    'General Director':['warning','2 yêu cầu tuyển dụng đang chờ bạn phê duyệt',`REQ-2026-005 (${labelVi('HR Officer')}) và REQ-2026-008 (${labelVi('DevOps Engineer')} sau khi phòng nhân sự phê duyệt).`,''],
    'Department Manager':['warning','2 yêu cầu đang chờ phòng ban phê duyệt',`REQ-2026-012 ${labelVi('Key Account Manager')}, REQ-2026-013 ${labelVi('UI/UX Designer')}.`,''],
    'Recruitment Requester':['info','REQ-2026-006 cần chỉnh sửa','Trưởng phòng nhân sự đã yêu cầu bổ sung thông tin ngân sách cho chiến dịch Tết.',btn('Mở yêu cầu',{size:'btn-sm',action:'openRequest',data:{code:'REQ-2026-006'}})],
  }[state.role];
  return msgs ? `<div class="mb-4">${alertBox(msgs[0], msgs[1], msgs[2], msgs[3]?`<div class="alert-actions">${msgs[3]}</div>`:'')}</div>` : '';
}
function statCard(k){
  const good = k.change===0 ? 'flat' : ((k.goodWhen==='down' ? k.change<0 : k.change>0) ? 'good' : 'bad');
  return `<button class="card stat-card" data-action="go" data-page="${k.page}" data-preset="${k.preset}" aria-label="${esc(labelVi(k.label))}: ${k.value}, ${k.change>0?'+':''}${k.change}% so với tháng trước. Mở danh sách">
    <div class="stat-top"><span class="stat-icon tone-${k.tone}">${icon(k.icon)}</span><span class="stat-change ${good}">${icon(k.change>0?'trendUp':k.change<0?'trendDown':'minus')}${k.change>0?'+':''}${k.change}%</span></div>
    <div><div class="stat-value">${k.value}</div><div class="stat-label">${esc(labelVi(k.label))}</div></div>
    <div class="stat-foot">so với tháng trước</div>
  </button>`;
}
var STAGE_COLOR = s => ({'Rejected':'var(--danger)','Hired':'var(--success)','Offer Sent':'var(--info)'}[s] || 'var(--primary)');
var STAGE_OPACITY = s => ({'New':.35,'Screening':.5,'Interview Scheduled':.65,'Interviewing':.8,'Passed':1}[s] || 1);
function pipelineCard(){
  const total = PIPELINE.reduce((a,[,c])=>a+c,0), max = Math.max(...PIPELINE.map(p=>p[1]));
  return `<!-- React component: ApplicantPipeline -->
  <section class="card" aria-labelledby="pipe-title">
    <div class="card-header"><div><h2 class="card-title" id="pipe-title">Quy trình ứng viên</h2><div class="card-sub">${total} ứng viên trong các yêu cầu đang mở · chọn một giai đoạn để lọc</div></div>${btn('Xem tất cả',{variant:'ghost',size:'btn-sm',ic:'arrowRight',action:'go',data:{page:'applicants'}})}</div>
    <div class="card-body">
      <div class="stack-bar" aria-hidden="true">${PIPELINE.map(([s,c])=>`<span style="flex:${c};background:${STAGE_COLOR(s)};opacity:${STAGE_OPACITY(s)}" title="${labelVi(s)}: ${c}"></span>`).join('')}</div>
      ${PIPELINE.map(([s,c])=>`<button class="pipe-row" data-action="go" data-page="applicants" data-preset="stage:${s}" aria-label="${labelVi(s)}: ${c} ứng viên">
        <span class="pipe-label"><span class="pipe-swatch" style="background:${STAGE_COLOR(s)};opacity:${STAGE_OPACITY(s)}"></span>${labelVi(s)}</span>
        <span class="pipe-bar"><span style="width:${c/max*100}%;background:${STAGE_COLOR(s)};opacity:${STAGE_OPACITY(s)}"></span></span>
        <span class="pipe-val"><strong>${c}</strong> <span class="subtle">${(c/total*100).toFixed(0)}%</span></span>
      </button>`).join('')}
    </div>
  </section>`;
}
function upcomingCard(){
  const list = INTERVIEWS.filter(i=>['Scheduled','In Progress'].includes(i.status) && i.date>=TODAY).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).slice(0,6);
  return `<section class="card" aria-labelledby="up-title">
    <div class="card-header"><div><h2 class="card-title" id="up-title">Lịch phỏng vấn sắp tới</h2><div class="card-sub">${list.length} cuộc phỏng vấn tiếp theo</div></div>${btn('Lịch',{variant:'ghost',size:'btn-sm',ic:'calendar',action:'go',data:{page:'interviews',preset:'calendar'}})}</div>
    <div>${list.map(i=>{ const a=findApp(i.app); return `<div class="list-row clickable" role="button" tabindex="0" data-action="interviewDrawer" data-code="${i.code}" aria-label="Phỏng vấn ${esc(a.name)} ${fmtDate(i.date)} ${i.start}">
      ${avatar(a.name)}
      <div class="grow"><div class="cell-main">${esc(a.name)}</div><div class="cell-sub">${esc(labelVi(a.position))} · ${esc(labelVi(i.round))}</div></div>
      <div class="right" style="min-width:120px"><div class="small strong">${i.date===TODAY?'Hôm nay':fmtDate(i.date)} · ${i.start}</div><div class="cell-sub row" style="justify-content:flex-end;gap:4px">${icon(i.method==='Online'?'video':'pin')}${labelVi(i.method)} · ${esc(firstName(i.lead))}</div></div>
      ${i.status==='In Progress'?badge(labelVi('In Progress')):''}
    </div>`;}).join('')}</div>
  </section>`;
}
function tasksCard(){
  const pendingFb = INTERVIEWS.filter(i=>i.status==='Completed' && fbStatus(i)==='Pending');
  const expiring = OFFERS.filter(o=>o.status==='Sent').sort((a,b)=>a.deadline.localeCompare(b.deadline));
  const waiting = REQUESTS.filter(r=>r.state.startsWith('Pending'));
  const untouched = APPLICANTS.filter(a=>a.stage==='New');
  const group = (ic, tone, title, count, items) => `<div class="task-group"><div class="task-head"><span class="stat-icon tone-${tone}">${icon(ic)}</span><strong class="grow">${title}</strong><span class="pill-count">${count}</span></div>${items || '<div class="subtle small">Không có việc cần xử lý 🎉</div>'}</div>`;
  return `<!-- React component: TaskList -->
  <section class="card" aria-labelledby="task-title">
    <div class="card-header"><div><h2 class="card-title" id="task-title">Việc cần xử lý</h2><div class="card-sub">Các đầu việc cần bạn chú ý</div></div></div>
    ${group('message','danger','Nhận xét phỏng vấn chưa hoàn thành',pendingFb.length, pendingFb.map(i=>{const a=findApp(i.app); const missing=i.interviewers.filter(n=>!i.feedback[n]||i.feedback[n].status!=='Submitted'); return `<button class="task-link" data-action="openFeedback" data-code="${i.code}"><span>${esc(a.name)} · ${esc(labelVi(i.round))}</span><span>${esc(missing.map(firstName).join(', '))}</span></button>`;}).join(''))}
    ${group('hourglass','warning','Thư mời sắp hết hạn / quá hạn',expiring.length, expiring.map(o=>{const d=daysBetween(TODAY,o.deadline); return `<button class="task-link" data-action="openOffer" data-code="${o.code}"><span>${esc(o.applicant)} · ${o.code}</span><span class="${d<0?'text-danger strong':''}">${d<0?`Quá hạn ${-d} ngày`:`Còn ${d} ngày`}</span></button>`;}).join(''))}
    ${group('file','primary','Yêu cầu đang chờ duyệt',waiting.length, waiting.slice(0,4).map(r=>`<button class="task-link" data-action="openRequest" data-code="${r.code}"><span>${r.code} · ${esc(labelVi(r.position))}</span><span>${daysBetween(r.requestDate,TODAY)} ngày</span></button>`).join(''))}
    ${group('userX','info','Ứng viên chưa được xử lý',untouched.length, untouched.map(a=>`<button class="task-link" data-action="openApplicant" data-code="${a.code}"><span>${esc(a.name)} · ${esc(labelVi(a.position))}</span><span>${daysBetween(a.applied,TODAY)} ngày trước</span></button>`).join(''))}
  </section>`;
}
function approvalsCard(){
  const list = REQUESTS.filter(r=>r.state.startsWith('Pending'));
  return `<section class="card" aria-labelledby="appr-title">
    <div class="card-header"><div><h2 class="card-title" id="appr-title">Yêu cầu chờ phê duyệt</h2><div class="card-sub">Các yêu cầu được đánh dấu “Chờ bạn xử lý” có thể được duyệt theo vai trò hiện tại</div></div>${btn('Tất cả yêu cầu',{variant:'ghost',size:'btn-sm',ic:'arrowRight',action:'go',data:{page:'requests',preset:'pending'}})}</div>
    <div class="table-wrap"><table class="table" style="min-width:820px">
      <thead><tr><th>Mã yêu cầu</th><th>Vị trí</th><th>Phòng ban</th><th>Người đề xuất</th><th>Trạng thái</th><th>Thời gian chờ</th><th class="right">Thao tác</th></tr></thead>
      <tbody>${list.map(r=>{ const days=daysBetween(r.requestDate,TODAY); const mine = reqActions(r).includes('approve'); return `<tr>
        <td><span class="code">${r.code}</span></td>
        <td><div class="cell-main">${esc(labelVi(r.position))}</div>${mine?'<span class="badge badge-primary mt-2" style="height:18px;font-size:11px">Chờ bạn xử lý</span>':''}</td>
        <td>${esc(r.dept)}</td><td>${person(r.requester,'', 'xs')}</td><td>${badge(labelVi(r.state),TONE[r.state])}</td>
        <td><span class="row" style="gap:4px">${icon('clock')}<span class="${days>7?'text-danger strong':''}">${days} ngày</span></span></td>
        <td class="right">${btn('Xem',{size:'btn-sm',action:'openRequest',data:{code:r.code},ic:'eye'})}</td></tr>`;}).join('')}</tbody>
    </table></div>
  </section>`;
}
