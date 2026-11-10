"use strict";

/* ------------------------------------------------------------ APPLICANT LIST */
function nextInterview(a){ const n = INTERVIEWS.filter(i=>i.app===a.code && i.status==='Scheduled' && i.date>=TODAY).sort((x,y)=>(x.date+x.start).localeCompare(y.date+y.start))[0]; return n; }
function filterApplicants(ignoreStage){
  const f = state.app.filters, q = norm(f.search.trim());
  return APPLICANTS.filter(a=>(!q || norm(`${a.code} ${a.name} ${a.email} ${a.position}`).includes(q)) && (!f.position||a.position===f.position) && (!f.dept||a.dept===f.dept) && (ignoreStage || !f.status||a.stage===f.status) && (!f.source||a.source===f.source) && (!f.hr||a.hr===f.hr))
    .sort((a,b)=>b.applied.localeCompare(a.applied));
}
PAGES.applicants = () => {
  const f = state.app.filters, s = state.app;
  const positions = [...new Set(APPLICANTS.map(a=>a.position))];
  const actions = [PERM.scheduleInterview()?btn('Schedule Interview',{ic:'calendar',action:'openSchedule'}):'', PERM.manageApplicants()?btn('Add Applicant',{variant:'primary',ic:'plus',action:'mockAddApplicant'}):''].join('');
  return `${pageHeader('Applicants','Quản lý ứng viên theo từng giai đoạn tuyển dụng.',actions)}
  <div class="card">
    <div class="filter-panel ${s.showFilters?'show':''}" id="app-filters" role="search" aria-label="Lọc ứng viên">
      ${field({id:'af-search',label:'Search applicant',control:`<div class="input-wrap prefix">${icon('search')}${input('af-search',{value:f.search,placeholder:'Name, code, email…',attrs:'data-input="appFilter" data-key="search"'})}</div>`})}
      ${field({id:'af-position',label:'Position',control:select('af-position',positions,{value:f.position,placeholder:'All positions',attrs:'data-change="appFilter" data-key="position"'})})}
      ${field({id:'af-dept',label:'Department',control:select('af-dept',DEPTS,{value:f.dept,placeholder:'All departments',attrs:'data-change="appFilter" data-key="dept"'})})}
      ${field({id:'af-status',label:'Applicant Status',control:select('af-status',STAGES,{value:f.status,placeholder:'All statuses',attrs:'data-change="appFilter" data-key="status"'})})}
      ${field({id:'af-source',label:'Application Source',control:select('af-source',SOURCES,{value:f.source,placeholder:'All sources',attrs:'data-change="appFilter" data-key="source"'})})}
      ${field({id:'af-hr',label:'Assigned HR Officer',control:select('af-hr',HR_OFFICERS,{value:f.hr,placeholder:'Anyone',attrs:'data-change="appFilter" data-key="hr"'})})}
    </div>
    <div class="table-toolbar">
      <div class="row row-wrap">
        <button class="btn btn-secondary btn-sm filter-toggle" data-action="toggleFilters" data-ns="app" aria-expanded="${s.showFilters}" aria-controls="app-filters">${icon('filter')}Bộ lọc</button>
        <span class="small muted" id="app-count"></span>
        ${Object.values(f).some(Boolean)?btn('Clear filters',{variant:'ghost',size:'btn-sm',ic:'x',action:'resetAppFilter'}):''}
      </div>
      <div class="segmented" role="group" aria-label="Chế độ xem">
        <button class="${s.view==='table'?'active':''}" data-action="setAppView" data-view="table" aria-pressed="${s.view==='table'}">${icon('list')}Bảng</button>
        <button class="${s.view==='kanban'?'active':''}" data-action="setAppView" data-view="kanban" aria-pressed="${s.view==='kanban'}">${icon('kanban')}Kanban</button>
      </div>
    </div>
    <div id="app-results">${appResults()}</div>
  </div>`;
};
AFTER.applicants = () => updateAppCount();
function updateAppCount(){ const el=$('#app-count'); if(el) el.textContent = `${filterApplicants(state.app.view==='kanban').length} ứng viên`; }
function appResults(){
  if(state.app.view==='kanban') return kanbanView();
  const list = filterApplicants();
  if(!list.length) return emptyState({ic:'search',title:'No applicants match your filters',text:'Thử từ khóa khác hoặc xóa bộ lọc.',actions:btn('Clear filters',{action:'resetAppFilter',ic:'refresh'})});
  const rows = paginate(list,'app');
  return `<!-- React component: ApplicantTable -->
  <div class="table-wrap"><table class="table" style="min-width:1200px">
    <thead><tr><th>Mã ứng viên</th><th>Tên ứng viên</th><th>Vị trí</th><th>Phòng ban</th><th>Nguồn</th><th>Nhân sự phụ trách</th><th>Giai đoạn hiện tại</th><th>Ngày ứng tuyển</th><th>Phỏng vấn tiếp theo</th><th class="actions-col"><span class="sr-only">Thao tác</span></th></tr></thead>
    <tbody>${rows.map(a=>{ const n=nextInterview(a); return `<tr class="clickable" tabindex="0" data-action="openApplicant" data-code="${a.code}" aria-label="${esc(a.name)}">
      <td><span class="code">${a.code}</span></td>
      <td>${person(a.name,a.email)}</td>
      <td>${esc(labelVi(a.position))}</td><td>${esc(a.dept)}</td><td>${esc(labelVi(a.source))}</td><td>${esc(a.hr)}</td>
      <td>${badge(a.stage)}</td><td>${fmtDate(a.applied)}</td>
      <td>${n?`<div class="small strong">${fmtDate(n.date)} ${n.start}</div><div class="cell-sub">${esc(labelVi(n.round))}</div>`:'<span class="subtle">—</span>'}</td>
      <td class="actions-col"><button class="icon-btn sm" data-action="appMenu" data-code="${a.code}" aria-label="Thao tác khác cho ${esc(a.name)}" aria-haspopup="menu">${icon('more')}</button></td>
    </tr>`;}).join('')}</tbody>
  </table></div>${pager('app',list.length)}`;
}
var KANBAN_STAGES = ['New','Screening','Interview Scheduled','Interviewing','Passed','Rejected','Offer Sent','Hired'];
function kanbanView(){
  const list = filterApplicants(true);
  return `<!-- React component: ApplicantKanban > KanbanColumn > ApplicantCard -->
  <div class="kanban" aria-label="Bảng ứng viên Kanban">${KANBAN_STAGES.map(st=>{
    const items = list.filter(a=>a.stage===st);
    return `<section class="kanban-col" aria-label="${labelVi(st)}, ${items.length} ứng viên">
      <div class="kanban-col-head"><h3><span class="badge-dot" style="width:8px;height:8px;color:${STAGE_COLOR(st)};opacity:${STAGE_OPACITY(st)}"></span>${labelVi(st)}</h3><span class="pill-count">${items.length}</span></div>
      <div class="kanban-list">${items.length? items.map(a=>`<div class="k-card" role="button" tabindex="0" data-action="openApplicant" data-code="${a.code}" aria-label="${esc(a.name)}, ${esc(a.position)}">
        <div class="k-card-top">${avatar(a.name)}<div class="grow" style="min-width:0"><div class="cell-main" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.name)}</div><div class="cell-sub">${esc(a.position)}</div></div><button class="icon-btn sm" data-action="appMenu" data-code="${a.code}" aria-label="Actions for ${esc(a.name)}" aria-haspopup="menu">${icon('moreH')}</button></div>
        <div class="k-meta"><span>${icon('building')}${esc(a.dept)}</span><span>${icon('calendar')}Ứng tuyển ${fmtDate(a.applied)}</span><span>${icon('user')}Nhân sự: ${esc(a.hr)}</span></div>
          <div class="k-tags">${a.tags.map(t=>`<span class="tag">${esc(labelVi(t))}</span>`).join('')}<span class="tag">${esc(labelVi(a.source))}</span></div>
        </div>`).join('') : '<div class="k-empty">Không có ứng viên</div>'}</div>
    </section>`;}).join('')}</div>`;
}

/* ---------------------------------------------------------- APPLICANT DETAIL */
function fbStatus(iv){
  if(['Cancelled','No Show'].includes(iv.status)) return 'Not Required';
  if(['Scheduled','In Progress'].includes(iv.status)) return 'Not Started';
  return iv.interviewers.every(n=>iv.feedback[n] && iv.feedback[n].status==='Submitted') ? 'Submitted' : 'Pending';
}
PAGES.applicantDetail = () => {
  const a = findApp(state.params.code);
  if(!a) return emptyState({ic:'alertCircle',variant:'error',title:'Applicant not found',actions:btn('Back',{action:'go',data:{page:'applicants'}})});
  const ivs = INTERVIEWS.filter(i=>i.app===a.code);
  const offer = OFFERS.find(o=>o.app===a.code && o.status!=='Cancelled') || OFFERS.find(o=>o.app===a.code);
  const t = state.tab.applicant;
  const canManage = PERM.manageApplicants();
  const closed = ['Rejected','Hired'].includes(a.stage);
  return `
  <section class="card detail-header">
    ${btn('Back',{variant:'ghost',size:'btn-sm',ic:'arrowLeft',action:'go',data:{page:'applicants'}})}
    <div class="dh-main">
      <div class="applicant-hero">
        ${avatar(a.name,'lg')}
        <div>
          <div class="dh-code"><span class="code">${a.code}</span>${badge(a.stage,null,'badge-lg')}</div>
          <h1 style="font-size:22px;font-weight:700;margin-top:4px">${esc(a.name)}</h1>
          <div class="muted small">${esc(labelVi(a.position))} · ${esc(a.dept)}</div>
          <div class="contact-list"><span>${icon('mail')}${esc(a.email)}</span><span>${icon('phone')}${esc(a.phone)}</span><span>${icon('userCheck')}Nhân sự: ${esc(a.hr)}</span></div>
        </div>
      </div>
      <div class="workflow-actions">
        ${canManage?btn('Reject',{variant:'danger-outline',ic:'x',action:'rejectApplicant',data:{code:a.code},disabled:closed,tip:closed?`Ứng viên đã ở trạng thái ${labelVi(a.stage)}`:''}):''}
        ${PERM.scheduleInterview()?btn('Schedule Interview',{variant:'primary',ic:'calendar',action:'openSchedule',data:{app:a.code},disabled:closed,tip:closed?'Không thể lên lịch cho ứng viên đã kết thúc quy trình':''}):''}
        <button class="btn btn-secondary" data-action="appMenu" data-code="${a.code}" aria-haspopup="menu">${icon('moreH')}Thao tác khác</button>
      </div>
    </div>
    ${a.stage==='Rejected'&&a.rejectReason?`<div class="mt-4">${alertBox('danger','Ứng viên đã bị từ chối',esc(a.rejectReason))}</div>`:''}
  </section>
  <div class="mt-4">
    ${tabs('applicant',[{key:'overview',label:'Tổng quan',icon:'user'},{key:'interviews',label:'Phỏng vấn',icon:'calendar',count:ivs.length},{key:'feedback',label:'Nhận xét',icon:'message'},{key:'offer',label:'Thư mời nhận việc',icon:'briefcase'},{key:'activity',label:'Hoạt động',icon:'activity'},{key:'audit',label:'Lịch sử thao tác',icon:'history'}],t)}
    <div class="tab-panel" id="panel-applicant" role="tabpanel" aria-labelledby="tab-applicant-${t}">${APP_TABS[t](a,ivs,offer)}</div>
  </div>`;
};
var APP_TABS = {
  overview:(a)=>`<div class="detail-grid">
    <div class="stack">
      <section class="card"><div class="card-header"><h2 class="card-title">Thông tin cá nhân</h2></div><div class="card-body"><dl class="dl">
        <div><dt>Họ và tên</dt><dd>${esc(a.name)}</dd></div><div><dt>Giới tính</dt><dd>${esc(labelVi(a.gender))}</dd></div>
        <div><dt>Ngày sinh</dt><dd>${fmtDate(a.dob)}</dd></div><div><dt>Địa chỉ</dt><dd>${esc(a.address)}</dd></div>
        <div><dt>Email</dt><dd><a href="mailto:${esc(a.email)}">${esc(a.email)}</a></dd></div><div><dt>Phone</dt><dd>${esc(a.phone)}</dd></div>
      </dl></div></section>
      <section class="card"><div class="card-header"><h2 class="card-title">Thông tin ứng tuyển</h2></div><div class="card-body"><dl class="dl">
        <div><dt>Yêu cầu tuyển dụng</dt><dd><a href="#" data-action="openRequest" data-code="${a.reqCode}">${a.reqCode}</a></dd></div><div><dt>Vị trí</dt><dd>${esc(labelVi(a.position))}</dd></div>
        <div><dt>Phòng ban</dt><dd>${esc(a.dept)}</dd></div><div><dt>Nguồn ứng tuyển</dt><dd>${esc(labelVi(a.source))}</dd></div>
        <div><dt>Ngày ứng tuyển</dt><dd>${fmtDate(a.applied)}</dd></div><div><dt>Chuyên viên nhân sự phụ trách</dt><dd>${esc(a.hr)}</dd></div>
      </dl></div></section>
      <section class="card"><div class="card-header"><h2 class="card-title">Kinh nghiệm</h2></div><div class="card-body"><dl class="dl">
        <div><dt>Tổng số năm kinh nghiệm</dt><dd>${a.exp} năm</dd></div><div><dt>Công ty hiện tại</dt><dd>${esc(a.company)}</dd></div>
        <div><dt>Chức danh hiện tại</dt><dd>${esc(labelVi(a.lastTitle))}</dd></div><div><dt>Học vấn</dt><dd>${esc(a.edu)}</dd></div>
        <div class="full"><dt>Kỹ năng</dt><dd class="row row-wrap">${a.tags.map(t=>`<span class="tag">${esc(labelVi(t))}</span>`).join('')}</dd></div>
      </dl></div></section>
    </div>
    <aside class="stack">
      <section class="card"><div class="card-header"><h2 class="card-title">Lương và thời gian có thể bắt đầu</h2>${PERM.seeSalary()?'':`<span class="badge badge-warning">${icon('lock')}Bị giới hạn</span>`}</div><div class="card-body"><dl class="dl" style="grid-template-columns:1fr">
        <div><dt>Mức lương mong muốn</dt><dd>${money(a.expected)}</dd></div><div><dt>Ngày có thể bắt đầu</dt><dd>${fmtDate(a.available)}</dd></div>
      </dl></div></section>
      <section class="card"><div class="card-header"><h2 class="card-title">Tệp hồ sơ ứng viên</h2></div><div class="card-body">
        <div class="file-item"><span class="file-icon tone-danger">${icon('file')}</span><div class="grow" style="min-width:0"><div class="cell-main" style="overflow:hidden;text-overflow:ellipsis">CV_${esc(norm(a.name).replace(/\s+/g,'_'))}.pdf</div><div class="cell-sub">412 KB · ${fmtDate(a.applied)}</div></div></div>
        <div class="row mt-3">${btn('Preview',{size:'btn-sm',ic:'eye',action:'mockPreview'})}${btn('Download',{size:'btn-sm',ic:'download',action:'mockDownload',data:{name:`CV_${a.code}.pdf`}})}</div>
      </div></section>
    </aside>
  </div>`,
  interviews:(a,ivs)=> ivs.length ? `<ol class="timeline">${ivs.sort((x,y)=>(y.date+y.start).localeCompare(x.date+x.start)).map(i=>`<li class="tl-item"><span class="tl-dot tone-${TONE[i.status]==='neutral'?'':TONE[i.status]}">${icon(i.method==='Online'?'video':'pin')}</span>
      <div class="tl-card"><div class="tl-head"><strong>${esc(labelVi(i.round))}</strong>${badge(i.status)}${badge(fbStatus(i))}<span class="tl-time">${fmtDateLong(i.date)} · ${i.start}–${i.end}</span></div>
      <div class="tl-body row row-wrap" style="gap:16px"><span class="row" style="gap:6px">${avatarStack(i.interviewers)} ${esc(i.interviewers.join(', '))}</span><span class="row" style="gap:6px">${icon(i.method==='Online'?'link':'pin')}${esc(i.method==='Online'?i.url:i.location)}</span></div>
      <div class="row mt-3">${btn('Details',{size:'btn-sm',action:'interviewDrawer',data:{code:i.code}})}${i.status==='Completed'||i.status==='In Progress'?btn('Feedback',{size:'btn-sm',ic:'message',action:'openFeedback',data:{code:i.code}}):''}</div></div></li>`).join('')}</ol>`
    : `<section class="card">${emptyState({ic:'calendar',title:'Chưa có lịch phỏng vấn',text:'Ứng viên chưa có lịch phỏng vấn nào.',actions:PERM.scheduleInterview()?btn('Schedule Interview',{variant:'primary',ic:'plus',action:'openSchedule',data:{app:a.code}}):''})}</section>`,
  feedback:(a,ivs)=>{
    const me = currentUser().user;
    const done = ivs.filter(i=>Object.keys(i.feedback).length || i.interviewers.includes(me));
    if(state.role==='Recruitment Requester') return `<section class="card">${emptyState({ic:'lock',variant:'locked',title:'Nhận xét bị giới hạn quyền xem',text:'Người đề xuất tuyển dụng không có quyền xem đánh giá phỏng vấn. Hãy liên hệ phòng nhân sự nếu cần thêm thông tin.'})}</section>`;
    if(state.role==='Interviewer'){
      const mine = ivs.filter(i=>i.interviewers.includes(me));
      if(!mine.length) return `<section class="card">${emptyState({ic:'lock',variant:'locked',title:'Bạn không được phân công phỏng vấn ứng viên này',text:'Nhận xét chỉ hiển thị với người phỏng vấn được phân công và nhân sự.'})}</section>`;
    }
    if(!done.length) return `<section class="card">${emptyState({ic:'message',title:'Chưa có nhận xét',text:'Nhận xét sẽ xuất hiện sau khi hoàn tất phỏng vấn.'})}</section>`;
    return `<div class="stack">${done.map(i=>{
      const crit = criteriaForInterview(i);
      const iAmInterviewer = i.interviewers.includes(me);
      const mySubmitted = i.feedback[me] && i.feedback[me].status==='Submitted';
      const hideOthers = state.role==='Interviewer' && iAmInterviewer && !mySubmitted;
      return `<section class="card"><div class="card-header"><div><h2 class="card-title">${esc(labelVi(i.round))} · ${fmtDate(i.date)}</h2><div class="card-sub">${i.code} · ${i.interviewers.length} người phỏng vấn</div></div>${badge(fbStatus(i))}</div>
        <div class="card-body stack-sm">
          ${hideOthers?alertBox('info','Nhận xét của người phỏng vấn khác đang bị ẩn','Để đảm bảo đánh giá độc lập, bạn cần gửi nhận xét của mình trước khi xem nhận xét của người khác.',`<div class="alert-actions">${btn('Viết nhận xét của tôi',{variant:'primary',size:'btn-sm',ic:'edit',action:'openFeedback',data:{code:i.code}})}</div>`):''}
          ${i.interviewers.map(n=>{
            const fb = i.feedback[n];
            const isMe = n===me;
            if(!fb || fb.status!=='Submitted') return `<div class="feedback-card row between">${person(n,isMe?'Bạn':'Người phỏng vấn')}<span class="row">${badge(fb?'Draft':'Pending',fb?'neutral':'warning')}${isMe&&i.status!=='Scheduled'?btn('Viết nhận xét',{size:'btn-sm',action:'openFeedback',data:{code:i.code}}):''}</span></div>`;
            const total = fb.scores.reduce((x,y)=>x+Number(y||0),0);
            const hidden = hideOthers && !isMe;
            const body = `<div class="row between row-wrap">${person(n,`Đã gửi lúc ${fb.submittedAt}`)}<span class="row">${badge(fb.rec)}<span class="badge badge-neutral">Điểm ${total}/100</span></span></div><p class="small mt-3 muted">“${esc(fb.overall)}”</p><div class="row row-wrap mt-2">${crit.map((c,k)=>`<span class="tag">${esc(labelVi(c.name))}: ${fb.scores[k]}/${c.weight}</span>`).join('')}</div>`;
            return hidden ? `<div class="feedback-card locked-overlay"><div class="blurred" aria-hidden="true">${body}</div><div class="lock-msg"><span class="badge badge-warning">${icon('lock')}Gửi nhận xét của bạn để xem nội dung này</span></div></div>` : `<div class="feedback-card">${body}</div>`;
          }).join('')}
        </div></section>`;}).join('')}</div>`;
  },
  offer:(a,ivs,offer)=>{
    if(!offer) return `<section class="card">${emptyState({ic:'briefcase',title:'Chưa có thư mời nhận việc',text:a.stage==='Passed'?'Ứng viên đã đạt phỏng vấn. Bạn có thể tạo thư mời nhận việc.':'Chỉ tạo thư mời khi ứng viên đã đạt phỏng vấn.',actions:PERM.manageOffers()?btn('Tạo thư mời nhận việc',{variant:'primary',ic:'plus',action:'openNewOffer',data:{app:a.code},disabled:a.stage!=='Passed',tip:a.stage!=='Passed'?'Ứng viên cần đạt yêu cầu phỏng vấn trước':''}):''})}</section>`;
    const overdue = isOverdue(offer);
    return `<section class="card"><div class="card-header"><div><h2 class="card-title">${offer.code}</h2><div class="card-sub">${esc(offer.position)} · ${esc(offer.dept)}</div></div><span class="row">${badge(offer.status)}${overdue?badge('Overdue','danger'):''}</span></div>
      <div class="card-body">${overdue?`<div class="mb-4">${alertBox('danger','Offer quá hạn phản hồi',`Hạn phản hồi ${fmtDate(offer.deadline)} đã qua ${-daysBetween(TODAY,offer.deadline)} ngày.`)}</div>`:''}
      <dl class="dl cols-3"><div><dt>Mức lương đề xuất</dt><dd>${money(offer.salary)}</dd></div><div><dt>Ngày bắt đầu dự kiến</dt><dd>${fmtDate(offer.startDate)}</dd></div><div><dt>Hạn phản hồi</dt><dd>${fmtDate(offer.deadline)}</dd></div></dl>
      <div class="mt-4">${btn('Mở thư mời',{variant:'primary',ic:'arrowRight',action:'openOffer',data:{code:offer.code}})}</div></div></section>`;
  },
  activity:(a,ivs)=>{
    const ev = [[a.applied+' 08:15','inbox','info',`Nộp hồ sơ qua ${labelVi(a.source)}`],[addDays(a.applied,1)+' 09:30','user','neutral',`${a.hr} được phân công phụ trách`],[addDays(a.applied,2)+' 10:00','mail','neutral','Email xác nhận đã nhận hồ sơ được gửi tới ứng viên']];
    ivs.forEach(i=>ev.push([i.date+' '+i.start,'calendar','primary',`${labelVi(i.round)} — ${labelVi(i.status)}`]));
    if(['Hired','Offer Sent'].includes(a.stage)) ev.push([addDays(a.applied,20)+' 15:00','send','info','Thư mời nhận việc đã được gửi']);
    if(a.stage==='Hired') ev.push([addDays(a.applied,24)+' 11:00','userCheck','success','Ứng viên đã chấp nhận thư mời và được tuyển dụng']);
    if(a.stage==='Rejected') ev.push([addDays(a.applied,12)+' 16:00','userX','danger','Hồ sơ bị từ chối']);
    return `<section class="card card-body"><ul class="timeline">${ev.sort((x,y)=>y[0].localeCompare(x[0])).map(([t,ic,tone,txt])=>`<li class="tl-item"><span class="tl-dot tone-${tone}">${icon(ic)}</span><div class="tl-head" style="padding-top:4px"><span class="small">${esc(txt)}</span><span class="tl-time">${esc(t)}</span></div></li>`).join('')}</ul></section>`;
  },
  audit:(a)=>{
    const ev = [
      {actor:'Hệ thống',role:'Biểu mẫu trực tuyến',time:a.applied+' 08:15',action:'Created',from:null,to:'New',changes:[]},
      {actor:'Vũ Ngọc Lan',role:'HR Manager',time:addDays(a.applied,1)+' 09:30',action:'Updated',changes:[['Assigned HR Officer','—',a.hr]]},
      {actor:a.hr,role:'HR Officer',time:addDays(a.applied,2)+' 11:00',action:'Updated',changes:[['Expected Salary',fmtMoney(a.expected-2e6),fmtMoney(a.expected)]],sensitive:[0]},
    ];
    if(a.stage!=='New') ev.push({actor:a.hr,role:'HR Officer',time:addDays(a.applied,3)+' 14:00',action:'Stage changed',from:'New',to:a.stage==='Rejected'?'Rejected':'Screening',changes:[],reason:a.stage==='Rejected'?a.rejectReason:null});
    (a.audit||[]).forEach(x=>ev.push(x));
    return `<section class="card card-body">${PERM.seeSalary()?'':`<div class="mb-4">${alertBox('warning','Một số giá trị bị ẩn','Các thay đổi liên quan đến lương được che theo quyền của role hiện tại.')}</div>`}${auditTimeline(ev)}</section>`;
  },
};
