"use strict";

/* --------------------------------------------------- RECRUITMENT REQUEST LIST */
PAGES.requests = () => {
  const f = state.req.filters;
  const actions = [
    PERM.exportData()?btn('Export',{ic:'download',action:'exportRequests'}):'',
    PERM.createRequest()?btn('New Request',{variant:'primary',ic:'plus',action:'newRequest'}):'',
  ].join('');
  return `${pageHeader('Recruitment Requests','Tạo, theo dõi và phê duyệt yêu cầu tuyển dụng của các phòng ban.',actions)}
  <div class="card">
    <!-- React component: FilterPanel -->
    <div class="filter-panel ${state.req.showFilters?'show':''}" id="req-filters" role="search" aria-label="Lọc yêu cầu tuyển dụng">
      ${field({id:'rf-search',label:'Search',control:`<div class="input-wrap prefix">${icon('search')}${input('rf-search',{value:f.search,placeholder:'Code, position, requester…',attrs:'data-enter="applyReqFilter"'})}</div>`})}
      ${field({id:'rf-state',label:'Workflow State',control:select('rf-state',[{value:'__open',label:'All open'},{value:'__pending',label:'All pending'},...REQ_STATES],{value:f.state,placeholder:'All states'})})}
      ${field({id:'rf-dept',label:'Department',control:select('rf-dept',DEPTS,{value:f.dept,placeholder:'All departments'})})}
      ${field({id:'rf-priority',label:'Priority',control:select('rf-priority',PRIORITIES,{value:f.priority,placeholder:'All priorities'})})}
      ${field({id:'rf-emp',label:'Employment Type',control:select('rf-emp',EMP_TYPES,{value:f.empType,placeholder:'All types'})})}
      ${field({id:'rf-from',label:'Request Date From',control:input('rf-from',{type:'date',value:f.from})})}
      ${field({id:'rf-to',label:'Request Date To',control:input('rf-to',{type:'date',value:f.to})})}
      <div class="filter-actions">${btn('Apply Filter',{variant:'primary',ic:'filter',action:'applyReqFilter',id:'btn-apply-req'})}${btn('Reset',{variant:'ghost',action:'resetReqFilter'})}</div>
    </div>
    <div class="table-toolbar">
      <div class="row row-wrap">
        <button class="btn btn-secondary btn-sm filter-toggle" data-action="toggleFilters" data-ns="req" aria-expanded="${state.req.showFilters}" aria-controls="req-filters">${icon('filter')}Bộ lọc</button>
        <span id="req-selection" class="small muted">${selectionText()}</span>
      </div>
      <label class="switch small" data-tip="Mô phỏng: bật để xem trạng thái tải"><input type="checkbox" role="switch" data-change="toggleReqLoading" ${state.req.simLoading?'checked':''}><span>Mô phỏng tải dữ liệu</span></label>
    </div>
    <div id="req-results">${reqResults()}</div>
  </div>`;
};
function selectionText(){
  const n = state.req.selected.size;
  return n ? `<strong>${n}</strong> mục đã chọn · <button class="btn btn-ghost btn-sm" data-action="bulkExport">${icon('download')}Xuất mục đã chọn</button> <button class="btn btn-ghost btn-sm" data-action="clearSelection">Bỏ chọn</button>` : `${filterRequests().length} yêu cầu`;
}
function filterRequests(){
  const f = state.req.filters, q = norm(f.search.trim());
  return REQUESTS.filter(r =>
    (!q || norm(`${r.code} ${r.position} ${r.title} ${r.requester} ${r.dept}`).includes(q)) &&
    (!f.state || (f.state==='__open' ? OPEN_STATES.includes(r.state) : f.state==='__pending' ? r.state.startsWith('Pending') : r.state===f.state)) &&
    (!f.dept || r.dept===f.dept) && (!f.priority || r.priority===f.priority) && (!f.empType || r.empType===f.empType) &&
    (!f.from || r.requestDate>=f.from) && (!f.to || r.requestDate<=f.to)
  ).sort((a,b)=>b.requestDate.localeCompare(a.requestDate));
}
function reqResults(){
  if(state.req.simLoading || state.req.busy) return skeletonTable(10,6);
  const list = filterRequests();
  if(!list.length) return emptyState({ic:'search', title:'No requests found', text:'Không có yêu cầu nào khớp với bộ lọc hiện tại. Thử thay đổi từ khóa hoặc bỏ bớt điều kiện lọc.', actions:btn('Reset filters',{action:'resetReqFilter',ic:'refresh'})+(PERM.createRequest()?btn('New Request',{variant:'primary',ic:'plus',action:'newRequest'}):'')});
  const rows = paginate(list,'req');
  const allSel = rows.length && rows.every(r=>state.req.selected.has(r.code));
  return `<!-- React component: RecruitmentRequestTable -->
  <div class="table-wrap"><table class="table" style="min-width:1180px">
    <thead><tr>
      <th class="w-check"><input type="checkbox" data-action="selectAllReq" aria-label="Chọn tất cả trên trang này" ${allSel?'checked':''}></th>
      <th>Mã yêu cầu</th><th>Vị trí</th><th>Phòng ban</th><th class="num">Số lượng</th><th class="num">Đã tuyển</th><th>Mức độ ưu tiên</th><th>Trạng thái quy trình</th><th>Ngày yêu cầu</th><th>Ngày bắt đầu dự kiến</th><th class="actions-col"><span class="sr-only">Thao tác</span></th>
    </tr></thead>
    <tbody>${rows.map(r=>{ const sel=state.req.selected.has(r.code); return `<tr class="clickable ${sel?'selected':''}" tabindex="0" data-action="openRequest" data-code="${r.code}" aria-label="${r.code} ${esc(labelVi(r.position))}">
      <td><input type="checkbox" data-action="selectReq" data-code="${r.code}" aria-label="Chọn ${r.code}" ${sel?'checked':''}></td>
      <td><span class="code">${r.code}</span></td>
      <td><div class="cell-main">${esc(labelVi(r.position))}</div><div class="cell-sub">${esc(r.requester)} · ${esc(labelVi(r.empType))}</div></td>
      <td>${esc(r.dept)}</td>
      <td class="num">${r.headcount}</td>
      <td class="num">${r.hired}<span class="mini-progress" aria-hidden="true"><span style="width:${r.hired/r.headcount*100}%"></span></span></td>
      <td>${badge(r.priority)}</td>
      <td>${badge(r.state)}</td>
      <td>${fmtDate(r.requestDate)}</td>
      <td>${fmtDate(r.startDate)}</td>
      <td class="actions-col"><button class="icon-btn sm" data-action="reqMenu" data-code="${r.code}" aria-label="Thao tác khác cho ${r.code}" aria-haspopup="menu">${icon('more')}</button></td>
    </tr>`;}).join('')}</tbody>
  </table></div>${pager('req', list.length)}`;
}

/* ------------------------------------------------ RECRUITMENT REQUEST DETAIL */
var STEPS = ['Draft','Department Approval','HR Review','Director Approval','Approved'];
var STATE_STEP = {'Draft':0,'Pending Department Approval':1,'Pending HR Review':2,'Pending Director Approval':3,'Approved':4};
function reqActions(r){
  const A = [];
  switch(r.state){
    case 'Draft': if(has('Recruitment Requester','Department Manager','HR Manager')) A.push('edit','submit'); break;
    case 'Pending Department Approval': if(has('Department Manager')) A.push('approve','revision','reject'); break;
    case 'Pending HR Review': if(has('HR Manager','HR Officer')) A.push('approve','revision','reject'); break;
    case 'Pending Director Approval': if(has('General Director')) A.push('approve','revision','reject'); break;
    case 'Revision Required': if(has('Recruitment Requester','Department Manager')) A.push('edit','submit'); break;
    case 'Approved': if(has('HR Manager')) A.push('cancel'); break;
    case 'Cancelled': case 'Rejected': if(has('Recruitment Requester','HR Manager','Department Manager')) A.push('amend'); break;
  }
  return A;
}
/* React component: WorkflowActions */
function workflowActions(r){
  const A = reqActions(r);
  const map = {
    edit:     btn('Edit',{ic:'edit',action:'reqAction',data:{act:'edit',code:r.code}}),
    submit:   btn(r.state==='Revision Required'?'Resubmit for Approval':'Submit for Approval',{variant:'primary',ic:'send',action:'reqAction',data:{act:'submit',code:r.code}}),
    approve:  btn('Approve',{variant:'primary',ic:'check',action:'reqAction',data:{act:'approve',code:r.code}}),
    revision: btn('Request Revision',{ic:'rotate',action:'reqAction',data:{act:'revision',code:r.code}}),
    reject:   btn('Reject',{variant:'danger',ic:'x',action:'reqAction',data:{act:'reject',code:r.code}}),
    cancel:   btn('Cancel',{variant:'danger-outline',ic:'xCircle',action:'reqAction',data:{act:'cancel',code:r.code}}),
    amend:    btn('Amend',{variant:'primary',ic:'copy',action:'reqAction',data:{act:'amend',code:r.code}}),
  };
  const order = ['edit','revision','reject','cancel','amend','submit','approve'];
  const html = order.filter(a=>A.includes(a)).map(a=>map[a]).join('');
  return html || `<span class="small muted row" style="gap:6px">${icon('lock')}Không có thao tác quy trình cho vai trò <strong>${esc(labelVi(state.role))}</strong> ở trạng thái này</span>`;
}
function stepper(r){
  const cur = STATE_STEP[r.state];
  return `<div class="stepper" role="list" aria-label="Tiến độ quy trình">${STEPS.map((s,i)=>{
    let cls='', sub='', content=i+1;
    if(r.state==='Approved'){ cls='done'; content=icon('check'); sub = i===4?'Hoàn tất':''; }
    else if(r.state==='Cancelled'){ cls = i<4?'done':'error'; content = i<4?icon('check'):icon('x'); sub = i===4?'Đã hủy':''; }
    else if(r.state==='Revision Required' || r.state==='Rejected'){ const at = r.state==='Rejected'?(r.rejectedAt||1):(r.revisionAt||1); if(i<at){cls='done';content=icon('check');} else if(i===at){cls='error';content=icon(r.state==='Rejected'?'x':'rotate');sub=r.state;} }
    else { if(i<cur){cls='done';content=icon('check');} else if(i===cur){cls='current';sub=i===0?'Đang thực hiện':'Chờ phê duyệt';} }
    if(i===3 && !state.settings.requireGD && cls==='') sub='Không bắt buộc';
    return `<div class="step ${cls}" role="listitem" ${cls==='current'?'aria-current="step"':''}><div class="step-circle">${content}</div><div class="step-label">${labelVi(s)}</div>${sub?`<div class="step-sub">${sub}</div>`:''}</div>`;
  }).join('')}</div>`;
}
function lastReason(r, action){ const ev=[...AUDIT[r.code]].reverse().find(e=>e.action===action); return ev ? ev : null; }
PAGES.requestDetail = () => {
  const r = findReq(state.params.code);
  if(!r) return emptyState({ic:'alertCircle',variant:'error',title:'Request not found',text:'Yêu cầu không tồn tại hoặc đã bị xóa.',actions:btn('Back to list',{action:'go',data:{page:'requests'}})});
  const apps = APPLICANTS.filter(a=>a.reqCode===r.code);
  const t = state.tab.request;
  let stateAlert = '';
  if(r.state==='Approved') stateAlert = alertBox('warning','Tài liệu đã được phê duyệt — không thể chỉnh sửa trực tiếp',`Yêu cầu tuyển dụng đã được phê duyệt nên đã bị khóa. Để thay đổi thông tin, hãy <strong>hủy</strong> yêu cầu này rồi <strong>tạo bản sửa đổi</strong> (ví dụ ${r.code}-1) và gửi lại theo quy trình phê duyệt.`);
  else if(r.state==='Revision Required'){ const ev=lastReason(r,'Requested Revision'); stateAlert = alertBox('info','Yêu cầu chỉnh sửa', ev?`<strong>${esc(ev.actor)}</strong> (${esc(labelVi(ev.role))}): “${esc(ev.reason)}”`:'Vui lòng cập nhật và gửi lại.'); }
  else if(r.state==='Rejected'){ const ev=lastReason(r,'Rejected'); stateAlert = alertBox('danger','Yêu cầu bị từ chối', ev?`<strong>${esc(ev.actor)}</strong>: “${esc(ev.reason)}”. Dùng chức năng tạo bản sửa đổi nếu muốn tạo yêu cầu mới dựa trên yêu cầu này.`:''); }
  else if(r.state==='Cancelled') stateAlert = alertBox('neutral','Yêu cầu đã bị hủy','Yêu cầu đã bị hủy. Bạn có thể tạo bản sửa đổi mới.');
  else if(r.state==='Draft') stateAlert = alertBox('info','Bản nháp','Yêu cầu chưa được gửi. Hoàn thiện thông tin và chọn Gửi phê duyệt.');
  if(r.amendedFrom) stateAlert += `<div class="mt-3">${alertBox('neutral',`Bản sửa đổi từ ${r.amendedFrom}`,'Bản sửa đổi được tạo từ yêu cầu đã hủy hoặc bị từ chối.')}</div>`;
  return `
  <section class="card detail-header">
    ${btn('Back',{variant:'ghost',size:'btn-sm',ic:'arrowLeft',action:'go',data:{page:'requests'}})}
    <div class="dh-main">
      <div class="dh-title">
        <div class="dh-code"><span class="code">${r.code}</span>${badge(r.state,null,'badge-lg')}</div>
        <h1>${esc(labelVi(r.position))}</h1>
        <div class="dh-meta">
          <span>${icon('building')}${esc(r.dept)}</span><span>${icon('user')}Người đề xuất: ${esc(r.requester)}</span>
          <span>${icon('calendar')}Ngày gửi ${fmtDate(r.requestDate)}</span><span>${icon('flag')}${badge(r.priority)}</span>
        </div>
      </div>
      <!-- React component: WorkflowActions -->
      <div class="workflow-actions">${workflowActions(r)}</div>
    </div>
  </section>
  <section class="card card-body mt-4" aria-label="Tiến độ quy trình">${stepper(r)}</section>
  <div class="mt-4">${stateAlert}</div>
  <div class="mt-4">
    ${tabs('request',[
      {key:'overview',label:'Tổng quan',icon:'file'},{key:'applicants',label:'Ứng viên',icon:'users',count:apps.length},
      {key:'comments',label:'Bình luận',icon:'message',count:r.comments.length},{key:'attachments',label:'Tệp đính kèm',icon:'paperclip',count:3},
      {key:'activity',label:'Hoạt động',icon:'activity'},{key:'audit',label:'Lịch sử thao tác',icon:'history',count:AUDIT[r.code].length}],t)}
    <div class="tab-panel" id="panel-request" role="tabpanel" aria-labelledby="tab-request-${t}">${REQ_TABS[t](r, apps)}</div>
  </div>`;
};
var REQ_TABS = {
  overview:(r)=>{
    const editable = reqActions(r).includes('edit');
    const lockNote = editable ? btn('Edit in form',{size:'btn-sm',ic:'edit',action:'reqAction',data:{act:'edit',code:r.code}}) : `<span class="small muted row" style="gap:6px">${icon('lock')}Chỉ xem</span>`;
    const dis = {disabled:true};
    return `<div class="detail-grid">
      <div class="stack">
        <section class="card"><div class="card-header"><h2 class="card-title">Thông tin chính</h2>${lockNote}</div>
          <div class="card-body"><div class="form-grid">
            ${field({id:'d-pos',label:'Position',control:input('d-pos',{value:r.position,...dis})})}
            ${field({id:'d-dept',label:'Department',control:input('d-dept',{value:r.dept,...dis})})}
            ${field({id:'d-hc',label:'Number of Employees',control:input('d-hc',{type:'number',value:r.headcount,...dis})})}
            ${field({id:'d-hired',label:'Hired Count',control:input('d-hired',{type:'number',value:r.hired,...dis})})}
            ${field({id:'d-emp',label:'Employment Type',control:input('d-emp',{value:r.empType,...dis})})}
            ${field({id:'d-start',label:'Expected Start Date',control:input('d-start',{type:'date',value:r.startDate,...dis})})}
            ${field({id:'d-sal',label:'Salary Range',control:PERM.seeSalary()?input('d-sal',{value:`${fmtMoney(r.salaryMin)} – ${fmtMoney(r.salaryMax)}`,...dis}):`<div class="input" style="display:flex;align-items:center;border-style:dashed;background:var(--surface-2)">${masked('Đã ẩn theo vai trò')}</div>`})}
            ${field({id:'d-pri',label:'Priority',control:input('d-pri',{value:r.priority,...dis})})}
            ${field({id:'d-reason',label:'Reason',span:true,control:textarea('d-reason',{value:r.reason,rows:2,...dis})})}
            ${field({id:'d-jd',label:'Job Description',span:true,control:textarea('d-jd',{value:r.jd,rows:6,...dis})})}
          </div></div>
        </section>
      </div>
      <aside class="stack">
        <section class="card"><div class="card-header"><h2 class="card-title">Tiến độ tuyển dụng</h2></div><div class="card-body">
          <div class="row between"><span class="stat-value">${r.hired}<span class="muted" style="font-size:16px"> / ${r.headcount}</span></span>${badge(r.hired>=r.headcount?'Completed':'In Progress')}</div>
          <div class="mt-3">${progress(r.hired/r.headcount*100, r.hired>=r.headcount?'success':'')}</div>
          <dl class="dl mt-4"><div><dt>Ứng viên</dt><dd>${APPLICANTS.filter(a=>a.reqCode===r.code).length}</dd></div><div><dt>Loại hình</dt><dd>${esc(labelVi(r.category))}</dd></div>
          <div><dt>Số ngày mở</dt><dd>${daysBetween(r.requestDate,TODAY)}</dd></div><div><dt>Mức lương</dt><dd>${salaryRange(r)}</dd></div></dl>
        </div></section>
        <section class="card"><div class="card-header"><h2 class="card-title">Người phê duyệt</h2></div><div class="card-body stack-sm">
          ${[['Phạm Văn Long','Department Manager',1],['Vũ Ngọc Lan','HR Manager',2],['Nguyễn Hữu Phước','General Director',3]].map(([n,role,step])=>{
            const cur = STATE_STEP[r.state]; const done = r.state==='Approved'||r.state==='Cancelled'||(cur!==undefined&&cur>step);
            const isCur = cur===step; return `<div class="row between">${person(n,role)}${done?badge('Approved'):isCur?badge('Pending'):badge('Not Started')}</div>`;}).join('')}
        </div></section>
      </aside>
    </div>
    <section class="card mt-5"><div class="card-header"><div><h2 class="card-title">Tiêu chí tuyển dụng</h2><div class="card-sub">Tiêu chí đánh giá dùng cho phiếu nhận xét phỏng vấn</div></div>${weightBadge(r.criteria)}</div>
      <div class="table-wrap"><table class="table wrap" style="min-width:860px">
        <thead><tr><th>Tiêu chí</th><th>Mô tả</th><th class="num">Trọng số</th><th>Bắt buộc</th><th>Yêu cầu tối thiểu</th><th>Phương pháp đánh giá</th></tr></thead>
        <tbody>${r.criteria.map(c=>`<tr><td class="cell-main">${esc(labelVi(c.name))}</td><td class="muted">${esc(labelVi(c.desc))}</td><td class="num strong">${c.weight}%</td><td>${c.mandatory?badge('Mandatory','primary'):'<span class="subtle">Không bắt buộc</span>'}</td><td>${esc(labelVi(c.minReq))}</td><td>${esc(labelVi(c.method))}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="2">Tổng trọng số</td><td class="num">${r.criteria.reduce((a,c)=>a+Number(c.weight||0),0)}%</td><td colspan="3">${r.criteria.filter(c=>c.mandatory).length} tiêu chí bắt buộc</td></tr></tfoot>
      </table></div>
    </section>`;
  },
  applicants:(r, apps)=> apps.length ? `<section class="card"><div class="table-wrap"><table class="table" style="min-width:760px">
      <thead><tr><th>Ứng viên</th><th>Giai đoạn</th><th>Nguồn</th><th>Nhân sự phụ trách</th><th>Ngày ứng tuyển</th></tr></thead>
      <tbody>${apps.map(a=>`<tr class="clickable" tabindex="0" data-action="openApplicant" data-code="${a.code}"><td>${person(a.name,a.code)}</td><td>${badge(a.stage)}</td><td>${esc(labelVi(a.source))}</td><td>${esc(a.hr)}</td><td>${fmtDate(a.applied)}</td></tr>`).join('')}</tbody></table></div></section>`
    : `<section class="card">${emptyState({ic:'users',title:'No applicants yet',text:r.state==='Approved'?'Chưa có ứng viên nào cho yêu cầu này.':'Ứng viên chỉ được tiếp nhận sau khi yêu cầu tuyển dụng được phê duyệt.'})}</section>`,
  comments:(r)=>`<section class="card card-body">
      <div class="stack">${r.comments.length? r.comments.map(c=>`<div class="comment">${avatar(c.by)}<div class="comment-bubble"><div class="row between"><strong class="small">${esc(c.by)}</strong><span class="xs subtle">${esc(c.at)}</span></div><p class="small mt-2">${esc(c.text)}</p></div></div>`).join('') : emptyState({ic:'message',title:'Chưa có bình luận',text:'Hãy là người đầu tiên bình luận về yêu cầu này.'})}</div>
      <div class="divider"></div>
      <div class="comment">${avatar(currentUser().user)}<div class="grow">${field({id:'new-comment',label:'Viết bình luận',control:textarea('new-comment',{placeholder:'Nhập bình luận…',rows:3})})}<div class="row mt-2" style="justify-content:flex-end">${btn('Đăng bình luận',{variant:'primary',ic:'send',action:'postComment',data:{code:r.code}})}</div></div></div>
    </section>`,
  attachments:(r)=>`<section class="card card-body stack-sm">
      ${[['JD_'+r.position.replace(/\s+/g,'_')+'.pdf','248 KB','danger'],['Budget_Approval_2026.pdf','132 KB','danger'],['Org_Chart_'+r.dept.replace(/\s+/g,'_')+'.xlsx','56 KB','success']].map(([n,s,t])=>`<div class="file-item"><span class="file-icon tone-${t}">${icon('file')}</span><div class="grow"><div class="cell-main">${esc(n)}</div><div class="cell-sub">${s} · tải lên bởi ${esc(r.requester)}</div></div><button class="icon-btn sm" data-action="mockDownload" data-name="${esc(n)}" aria-label="Tải xuống ${esc(n)}">${icon('download')}</button></div>`).join('')}
      <button class="dropzone mt-3" data-action="mockUpload">${icon('upload')}<div class="mt-2"><strong>Nhấn để tải tệp lên</strong> hoặc kéo thả tệp vào đây</div><div class="xs subtle">PDF, DOCX, XLSX · tối đa 10 MB</div></button>
    </section>`,
  activity:(r)=>`<section class="card card-body"><ul class="timeline">
      ${[['eye','neutral',`${state.role==='HR Manager'?'Bạn':'Vũ Ngọc Lan'} đã xem yêu cầu`,`${TODAY} 08:42`],['mail','info','Email thông báo phê duyệt đã gửi tới người đề xuất',addDays(r.requestDate,3)+' 10:12'],['message','primary',`${r.comments.length} bình luận mới`,addDays(r.requestDate,3)+' 14:20'],['paperclip','neutral','Đã đính kèm Budget_Approval_2026.pdf',addDays(r.requestDate,1)+' 09:00'],['file','neutral',`${r.requester} đã tạo yêu cầu`,r.requestDate+' 09:00']].map(([ic,t,txt,time])=>`<li class="tl-item"><span class="tl-dot tone-${t}">${icon(ic)}</span><div class="tl-head" style="padding-top:4px"><span class="small">${esc(txt)}</span><span class="tl-time">${esc(time)}</span></div></li>`).join('')}
    </ul></section>`,
  audit:(r)=>`<section class="card card-body"><p class="small muted mb-4">Lịch sử thao tác ghi lại toàn bộ thay đổi trạng thái và dữ liệu. Không thể chỉnh sửa hoặc xóa.</p>${auditTimeline(AUDIT[r.code])}</section>`,
};
function weightBadge(criteria){ const t = criteria.reduce((a,c)=>a+Number(c.weight||0),0); return t===100 ? `<span class="weight-total ok">${icon('checkCircle')}Tổng trọng số: 100%</span>` : `<span class="weight-total bad">${icon('alertCircle')}Tổng trọng số: ${t}%</span>`; }
/* React component: ActivityTimeline (Audit Trail) */
function auditTimeline(events){
  const toneFor = a => /Reject|Cancel/.test(a)?'danger':/Revision/.test(a)?'warning':/Approved|Accepted|Hired/.test(a)?'success':/Submit|Resubmit|Sent/.test(a)?'primary':/Created|Amend/.test(a)?'info':'neutral';
  const icFor = a => /Reject|Cancel/.test(a)?'x':/Revision/.test(a)?'rotate':/Approved/.test(a)?'check':/Submit|Resubmit/.test(a)?'send':/Created/.test(a)?'plus':/Amend/.test(a)?'copy':'edit';
  return `<ol class="timeline">${[...events].reverse().map(e=>`<li class="tl-item"><span class="tl-dot tone-${toneFor(e.action)}">${icon(icFor(e.action))}</span>
    <div class="tl-card">
      <div class="tl-head">${avatar(e.actor,'xs')}<strong class="small">${esc(e.actor)}</strong><span class="xs subtle">${esc(labelVi(e.role||''))}</span><span class="small">·</span><span class="tl-action small">${esc(labelVi(e.action))}</span><span class="tl-time">${icon('clock','')} ${esc(e.time)}</span></div>
      ${(e.from||e.to)?`<div class="tl-transition"><span class="xs subtle">Trạng thái:</span>${e.from?badge(e.from):'<span class="xs subtle">—</span>'}${icon('arrowRight')}${badge(e.to)}</div>`:''}
      ${e.changes&&e.changes.length?`<table class="change-table"><thead><tr><th>Trường thông tin</th><th>Giá trị cũ</th><th>Giá trị mới</th></tr></thead><tbody>${e.changes.map((c,i)=>{const hide=(e.sensitive||[]).includes(i)&&!PERM.seeSalary(); return `<tr><td>${esc(labelVi(c[0]))}</td><td class="${hide?'':'old'}">${hide?masked():esc(labelVi(c[1]))}</td><td class="${hide?'':'new'}">${hide?masked():esc(labelVi(c[2]))}</td></tr>`;}).join('')}</tbody></table>`:''}
      ${e.reason?`<div class="tl-reason"><strong>Lý do:</strong> ${esc(e.reason)}</div>`:''}
    </div></li>`).join('')}</ol>`;
}

/* ------------------------------------------------- RECRUITMENT REQUEST FORM */
function newFormState(code){
  if(code){ const r=findReq(code); return {code:r.code,title:r.title,dept:r.dept,category:r.category,position:r.position,headcount:r.headcount,startDate:r.startDate,empType:r.empType,priority:r.priority,reason:r.reason,jd:r.jd,salaryMin:r.salaryMin,salaryMax:r.salaryMax,criteria:clone(r.criteria)}; }
  const def = currentUser().key==='Recruitment Requester'||currentUser().key==='Department Manager' ? 'Phòng Công nghệ' : '';
  return {code:null,title:'',dept:def,category:'',position:'',headcount:1,startDate:'',empType:'Full-time',priority:'Normal',reason:'',jd:'',salaryMin:'',salaryMax:'',
    criteria:[{name:'Technical Skills',desc:'Kiến thức chuyên môn',weight:40,mandatory:true,minReq:'≥ 2 năm kinh nghiệm',method:'Technical Test'},{name:'Communication',desc:'',weight:30,mandatory:false,minReq:'',method:'Interview'}]};
}
PAGES.requestForm = () => {
  if(!state.form) state.form = newFormState();
  if(!PERM.createRequest() && !(state.form && state.form.code)) return permissionDenied('creating recruitment requests');
  const f = state.form, e = state.formErrors;
  const errCount = Object.keys(e).length;
  const fi = (name, label, ctl, opts={}) => field({id:'rf2-'+name, label, error:e[name], ...opts, control:ctl});
  const bind = name => `data-input="formField" data-name="${name}"`;
  const bindC = name => `data-change="formField" data-name="${name}"`;
  return `${pageHeader(f.code?`Chỉnh sửa ${f.code}`:'Tạo yêu cầu tuyển dụng mới', 'Các trường có dấu <span class="text-danger">*</span> là bắt buộc khi gửi. Để lưu bản nháp, chỉ cần nhập tiêu đề và phòng ban.')}
  <div id="dirty-banner" class="mb-4" ${state.formDirty?'':'hidden'}>${alertBox('warning','Bạn có thay đổi chưa lưu','Thay đổi chưa được lưu. Nếu rời trang, bạn sẽ được hỏi xác nhận.')}</div>
  ${errCount?`<div class="mb-4" id="form-error-summary">${alertBox('danger',`Vui lòng sửa ${errCount} lỗi trước khi tiếp tục`,'Các trường có lỗi được đánh dấu màu đỏ bên dưới.')}</div>`:''}
  <form id="request-form" novalidate onsubmit="return false">
    <section class="card"><div class="card-header"><h2 class="card-title">${icon('file')}Thông tin chung</h2></div><div class="card-body"><div class="form-grid">
      ${fi('title','Request Title',input('rf2-title',{value:f.title,placeholder:'VD: Tuyển Backend Developer cho dự án Core Banking',error:e.title,attrs:bind('title')}),{required:true,span:true})}
      ${fi('dept','Department',select('rf2-dept',DEPTS,{value:f.dept,placeholder:'Select department',error:e.dept,attrs:bindC('dept')}),{required:true})}
      ${fi('category','Recruitment Category',select('rf2-category',CATEGORIES,{value:f.category,placeholder:'Select category',error:e.category,attrs:bindC('category')}),{required:true})}
      ${fi('position','Position Title',input('rf2-position',{value:f.position,placeholder:'VD: Backend Developer',error:e.position,attrs:bind('position')}),{required:true})}
      ${fi('headcount','Number of Employees',input('rf2-headcount',{type:'number',value:f.headcount,error:e.headcount,attrs:`min="1" max="${state.settings.maxEmployees}" step="1" ${bind('headcount')}`}),{required:true,help:`Tối đa ${state.settings.maxEmployees} người (Recruitment Settings)`})}
      ${fi('startDate','Expected Start Date',input('rf2-startDate',{type:'date',value:f.startDate,error:e.startDate,attrs:`min="${addDays(TODAY,1)}" ${bindC('startDate')}`}),{required:true})}
      ${fi('empType','Employment Type',select('rf2-empType',EMP_TYPES,{value:f.empType,error:e.empType,attrs:bindC('empType')}),{required:true})}
      ${fi('priority','Priority',select('rf2-priority',PRIORITIES.map(p=>({value:p,label:p+(p==='Urgent'&&!state.settings.allowUrgent?' (đã tắt trong phần Cài đặt)':'')})),{value:f.priority,error:e.priority,attrs:bindC('priority')}),{required:true})}
    </div></div></section>

    <section class="card mt-5"><div class="card-header"><h2 class="card-title">${icon('briefcase')}Thông tin công việc</h2></div><div class="card-body"><div class="form-grid">
      ${fi('reason','Reason',textarea('rf2-reason',{value:f.reason,rows:3,placeholder:'Lý do tuyển dụng: mở rộng, thay thế, dự án mới…',error:e.reason,attrs:bind('reason')}),{required:true,span:true})}
      ${fi('jd','Job Description',textarea('rf2-jd',{value:f.jd,rows:6,placeholder:'Mô tả công việc, trách nhiệm chính, yêu cầu…',error:e.jd,attrs:bind('jd')}),{required:true,span:true})}
      ${fi('salaryMin','Minimum Salary',`<div class="input-wrap">${input('rf2-salaryMin',{type:'number',value:f.salaryMin,placeholder:'15000000',error:e.salaryMin,attrs:`min="0" step="500000" ${bind('salaryMin')}`})}<span class="suffix">VND</span></div>`,{required:state.settings.requireSalary,help:'Lương gộp / tháng'})}
      ${fi('salaryMax','Maximum Salary',`<div class="input-wrap">${input('rf2-salaryMax',{type:'number',value:f.salaryMax,placeholder:'25000000',error:e.salaryMax,attrs:`min="0" step="500000" ${bind('salaryMax')}`})}<span class="suffix">VND</span></div>`,{required:state.settings.requireSalary,help:'Phải ≥ mức lương tối thiểu'})}
    </div></div></section>

    <section class="card mt-5"><div class="card-header"><div><h2 class="card-title">${icon('target')}Tiêu chí tuyển dụng</h2><div class="card-sub">Tổng trọng số phải bằng 100% và có ít nhất 1 tiêu chí bắt buộc</div></div>
      <div class="row row-wrap"><label class="sr-only" for="crit-template">Tải mẫu</label>${select('crit-template',[{value:'tech',label:'Mẫu: Công nghệ'},{value:'sales',label:'Mẫu: Kinh doanh'},{value:'general',label:'Mẫu: Chung'}],{placeholder:'Tải mẫu…',cls:'sm',attrs:'data-change="loadCritTemplate" style="width:190px"'})}</div></div>
      ${e.criteria||e.criteriaMandatory?`<div style="padding:12px 20px 0">${alertBox('danger','Tiêu chí chưa hợp lệ',[e.criteria,e.criteriaMandatory].filter(Boolean).map(esc).join('<br>'))}</div>`:''}
      <div class="table-wrap"><table class="table" style="min-width:1060px">
        <thead><tr><th style="width:200px">Tên tiêu chí *</th><th>Mô tả</th><th style="width:110px">Trọng số *</th><th class="center" style="width:90px">Bắt buộc</th><th>Yêu cầu tối thiểu</th><th style="width:170px">Phương pháp đánh giá</th><th class="actions-col"><span class="sr-only">Xóa</span></th></tr></thead>
        <tbody id="crit-body">${critRows()}</tbody>
      </table></div>
      <div class="card-footer" style="justify-content:space-between;flex-wrap:wrap">
        ${btn('Add Criterion',{ic:'plus',action:'addCrit'})}
        <div class="row row-wrap"><span id="mandatory-ind">${mandatoryInd()}</span><span id="weight-total">${weightBadge(f.criteria)}</span></div>
      </div>
    </section>

    <div class="sticky-actions">
      <span class="small muted row" style="gap:6px">${icon('info')}<span id="dirty-text">${state.formDirty?'Thay đổi chưa lưu':'Tất cả thay đổi đã được lưu'}</span></span>
      <div class="btn-group">
        ${btn('Cancel',{variant:'ghost',action:'cancelForm'})}
        ${btn('Save Draft',{ic:'download',action:'saveDraft',id:'btn-save-draft'})}
        ${btn('Submit for Approval',{variant:'primary',ic:'send',action:'submitForm',id:'btn-submit-form'})}
      </div>
    </div>
  </form>`;
};
function mandatoryInd(){ const n = state.form.criteria.filter(c=>c.mandatory).length; return n ? `<span class="badge badge-success">${icon('check')}${n} tiêu chí bắt buộc</span>` : `<span class="badge badge-danger">${icon('alert')}Chưa có tiêu chí bắt buộc</span>`; }
function critRows(){
  const f = state.form, e = state.formErrors;
  if(!f.criteria.length) return `<tr><td colspan="7">${emptyState({ic:'target',title:'Chưa có tiêu chí',text:'Thêm ít nhất một tiêu chí đánh giá.',actions:btn('Add Criterion',{variant:'primary',ic:'plus',action:'addCrit'})})}</td></tr>`;
  return f.criteria.map((c,i)=>{
    const ne=e[`crit_${i}_name`], we=e[`crit_${i}_weight`];
    const b = k => `data-input="critField" data-idx="${i}" data-key="${k}"`;
    return `<tr data-idx="${i}">
      <td><input class="input sm ${ne?'is-error':''}" value="${esc(labelVi(c.name))}" placeholder="VD: Kỹ năng chuyên môn" aria-label="Tên tiêu chí, dòng ${i+1}" ${ne?'aria-invalid="true"':''} ${b('name')}>${ne?`<div class="cell-error">${esc(ne)}</div>`:''}</td>
      <td><input class="input sm" value="${esc(labelVi(c.desc))}" placeholder="Mô tả" aria-label="Mô tả, dòng ${i+1}" ${b('desc')}></td>
      <td><div class="input-wrap"><input class="input sm ${we?'is-error':''}" type="number" min="0" max="100" value="${esc(c.weight)}" aria-label="Trọng số phần trăm, dòng ${i+1}" ${we?'aria-invalid="true"':''} ${b('weight')}><span class="suffix">%</span></div>${we?`<div class="cell-error">${esc(we)}</div>`:''}</td>
      <td class="center"><input type="checkbox" ${c.mandatory?'checked':''} aria-label="Bắt buộc, dòng ${i+1}" data-change="critField" data-idx="${i}" data-key="mandatory"></td>
      <td><input class="input sm" value="${esc(labelVi(c.minReq))}" placeholder="VD: ≥ 2 năm" aria-label="Yêu cầu tối thiểu, dòng ${i+1}" ${b('minReq')}></td>
      <td><select class="select sm" aria-label="Phương pháp đánh giá, dòng ${i+1}" data-change="critField" data-idx="${i}" data-key="method">${EVAL_METHODS.map(m=>`<option value="${m}" ${m===c.method?'selected':''}>${labelVi(m)}</option>`).join('')}</select></td>
      <td class="actions-col"><button type="button" class="icon-btn sm danger" data-action="delCrit" data-idx="${i}" aria-label="Xóa tiêu chí dòng ${i+1}" data-tip="Xóa" data-tip-pos="left">${icon('trash')}</button></td>
    </tr>`;
  }).join('');
}
function validateRequestForm(full){
  const f = state.form, e = {}, s = state.settings;
  if(!String(f.title).trim()) e.title='Request title is required.';
  if(!f.dept) e.dept='Please select a department.';
  if(full){
    if(!f.category) e.category='Please select a recruitment category.';
    if(!String(f.position).trim()) e.position='Position title is required.';
    const hc = Number(f.headcount);
    if(!hc || hc<1 || !Number.isInteger(hc)) e.headcount='Must be a whole number ≥ 1.';
    else if(hc>s.maxEmployees) e.headcount=`Cannot exceed ${s.maxEmployees} (Maximum Requested Employees).`;
    if(!f.startDate) e.startDate='Expected start date is required.'; else if(f.startDate<=TODAY) e.startDate='Must be a future date.';
    if(!f.empType) e.empType='Please select employment type.';
    if(f.priority==='Urgent' && !s.allowUrgent) e.priority='Urgent recruitment is disabled in Recruitment Settings.';
    if(String(f.reason).trim().length<10) e.reason='Please describe the reason (at least 10 characters).';
    if(!String(f.jd).trim()) e.jd='Job description is required.';
    if(s.requireSalary){ if(f.salaryMin==='' || f.salaryMin==null) e.salaryMin='Minimum salary is required.'; if(f.salaryMax==='' || f.salaryMax==null) e.salaryMax='Maximum salary is required.'; }
    if(f.salaryMin!=='' && f.salaryMax!=='' && Number(f.salaryMin)>Number(f.salaryMax)) e.salaryMax='Maximum salary must be greater than or equal to minimum.';
    if(!f.criteria.length) e.criteria='Add at least one criterion.';
    f.criteria.forEach((c,i)=>{ if(!String(c.name).trim()) e[`crit_${i}_name`]='Required'; if(!(Number(c.weight)>0)) e[`crit_${i}_weight`]='Must be > 0'; });
    const total = f.criteria.reduce((a,c)=>a+Number(c.weight||0),0);
    if(f.criteria.length && total!==100) e.criteria=`Total weight must equal 100% (currently ${total}%).`;
    if(f.criteria.length && !f.criteria.some(c=>c.mandatory)) e.criteriaMandatory='At least one criterion must be mandatory.';
  }
  return e;
}
