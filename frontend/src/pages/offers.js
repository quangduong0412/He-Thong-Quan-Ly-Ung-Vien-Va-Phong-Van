"use strict";

/* ----------------------------------------------------------- JOB OFFER LIST */
var isOverdue = o => o.status==='Sent' && o.deadline < TODAY;
function filterOffers(){ const f=state.off.filters, q=norm(f.search); return OFFERS.filter(o=>(!q||norm(`${o.code} ${o.applicant} ${o.position}`).includes(q)) && (!f.status || (f.status==='__active'?['Pending Approval','Approved','Sent'].includes(o.status):f.status==='__overdue'?isOverdue(o):o.status===f.status))); }
PAGES.offers = () => {
  const f = state.off.filters, list = filterOffers(), overdue = OFFERS.filter(isOverdue);
  const actions = [PERM.exportData()?btn('Export',{ic:'download',action:'exportOffers'}):'', PERM.manageOffers()?btn('New Offer',{variant:'primary',ic:'plus',action:'openNewOffer'}):''].join('');
  return `${pageHeader('Job Offers','Quản lý thư mời nhận việc và phản hồi của ứng viên.',actions)}
  ${overdue.length?`<div class="mb-4">${alertBox('danger',`${overdue.length} thư mời đã quá hạn phản hồi`,overdue.map(o=>`<a href="#" data-action="openOffer" data-code="${o.code}">${o.code}</a> · ${esc(o.applicant)} (hạn ${fmtDate(o.deadline)})`).join('<br>'))}</div>`:''}
  ${PERM.seeSalary()?'':`<div class="mb-4">${alertBox('warning','Mức lương đã ẩn','Vai trò hiện tại không có quyền xem mức lương đề xuất.')}</div>`}
  <div class="card">
    <div class="table-toolbar">
      <div class="row row-wrap grow">
        <div class="input-wrap prefix" style="max-width:300px;flex:1">${icon('search')}${input('of-search',{value:f.search,placeholder:'Tìm mã thư mời, ứng viên…',attrs:'data-input="offFilter" data-key="search" aria-label="Tìm thư mời"'})}</div>
        <label class="sr-only" for="of-status">Trạng thái thư mời</label>${select('of-status',[{value:'__active',label:'Đang hiệu lực'},{value:'__overdue',label:'Quá hạn'},...OFFER_STATUSES],{value:f.status,placeholder:'Tất cả trạng thái',attrs:'data-change="offFilter" data-key="status" style="max-width:190px"'})}
      </div>
    </div>
    <div id="off-results">${offResults(list)}</div>
  </div>`;
};
function offResults(list=filterOffers()){
  if(!list.length) return emptyState({ic:'briefcase',title:'No offers found',actions:btn('Clear filters',{action:'resetOffFilter',ic:'refresh'})});
  return `<!-- React component: JobOfferTable -->
  <div class="table-wrap"><table class="table" style="min-width:1100px">
    <thead><tr><th>Mã thư mời</th><th>Ứng viên</th><th>Vị trí</th><th>Phòng ban</th><th class="num">Mức lương đề xuất</th><th>Ngày bắt đầu dự kiến</th><th>Hạn phản hồi</th><th>Trạng thái thư mời</th><th class="actions-col"><span class="sr-only">Thao tác</span></th></tr></thead>
    <tbody>${list.map(o=>{ const od=isOverdue(o), dl=daysBetween(TODAY,o.deadline); return `<tr class="clickable ${od?'row-danger':''}" tabindex="0" data-action="openOffer" data-code="${o.code}">
      <td><span class="code">${o.code}</span></td><td>${person(o.applicant,o.app)}</td><td>${esc(labelVi(o.position))}</td><td>${esc(o.dept)}</td>
      <td class="num">${money(o.salary)}</td><td>${fmtDate(o.startDate)}</td>
      <td>${fmtDate(o.deadline)}${o.status==='Sent'?`<div class="cell-sub ${od?'text-danger strong':dl<=3?'text-warning':''}">${od?`${icon('alert','')} Quá hạn ${-dl} ngày`:`Còn ${dl} ngày`}</div>`:''}</td>
      <td><span class="row">${badge(o.status)}${od?badge('Overdue','danger'):''}</span></td>
      <td class="actions-col"><button class="icon-btn sm" data-action="offMenu" data-code="${o.code}" aria-label="Thao tác cho ${o.code}" aria-haspopup="menu">${icon('more')}</button></td>
    </tr>`;}).join('')}</tbody>
  </table></div>`;
}

/* --------------------------------------------------------- JOB OFFER DETAIL */
function offerActions(o){
  const od = isOverdue(o), A = [];
  const m = PERM.manageOffers(), ap = PERM.approveOffer();
  if(o.status==='Draft' && m) A.push(['submit','Submit for Approval','primary','send']);
  if(o.status==='Pending Approval' && ap) A.push(['approve','Approve','primary','check']);
  if(o.status==='Approved' && m) A.push(['send','Send Offer','primary','send', od]);
  if(o.status==='Sent' && m){ A.push(['decline','Mark as Declined','danger-outline','userX']); A.push(['accept','Mark as Accepted','success','userCheck', od, 'Response deadline has passed — cannot accept']); }
  if(['Draft','Pending Approval','Approved','Sent'].includes(o.status) && has('HR Manager')) A.unshift(['cancel','Cancel','ghost','xCircle']);
  return A;
}
PAGES.offerDetail = () => {
  const o = findOffer(state.params.code); if(!o) return emptyState({ic:'alertCircle',variant:'error',title:'Offer not found'});
  const od = isOverdue(o), A = offerActions(o);
  const hist = [{actor:o.createdBy,role:'HR Officer',time:'2026-10-20 10:00',action:'Created',from:null,to:'Draft',changes:[]}];
  const order = ['Draft','Pending Approval','Approved','Sent'];
  const reach = order.indexOf(o.status)>=0 ? order.indexOf(o.status) : (['Accepted','Declined','Expired'].includes(o.status)?3:0);
  if(reach>=1) hist.push({actor:o.createdBy,role:'HR Officer',time:'2026-10-21 09:00',action:'Submitted for Approval',from:'Draft',to:'Pending Approval',changes:[]});
  if(reach>=2) hist.push({actor:o.approver||'Vũ Ngọc Lan',role:'HR Manager',time:'2026-10-22 14:00',action:'Approved',from:'Pending Approval',to:'Approved',changes:[]});
  if(reach>=3) hist.push({actor:o.createdBy,role:'HR Officer',time:'2026-10-23 09:30',action:'Sent',from:'Approved',to:'Sent',changes:[]});
  if(['Accepted','Declined','Expired','Cancelled'].includes(o.status)) hist.push({actor:o.status==='Expired'?'System':o.createdBy,role:o.status==='Expired'?'Scheduler':'HR Officer',time:o.deadline+' 23:59',action:o.status==='Cancelled'?'Cancelled':`Marked as ${o.status}`,from:o.status==='Cancelled'?'Approved':'Sent',to:o.status,changes:[],reason:o.declineReason});
  (o.history||[]).forEach(h=>hist.push(h));
  return `<section class="card detail-header">
    ${btn('Back',{variant:'ghost',size:'btn-sm',ic:'arrowLeft',action:'go',data:{page:'offers'}})}
    <div class="dh-main"><div class="dh-title"><div class="dh-code"><span class="code">${o.code}</span>${badge(o.status,null,'badge-lg')}${od?badge('Overdue','danger','badge-lg'):''}</div><h1>${esc(o.applicant)}</h1>
      <div class="dh-meta"><span>${icon('briefcase')}${esc(labelVi(o.position))}</span><span>${icon('building')}${esc(o.dept)}</span><span>${icon('clock')}Hạn phản hồi ${fmtDate(o.deadline)}</span></div></div>
      <!-- React component: WorkflowActions (Job Offer) -->
      <div class="workflow-actions">${A.length?A.map(([act,label,variant,ic,dis,tip])=>btn(label,{variant,ic,action:'offerAction',data:{act,code:o.code},disabled:!!dis,tip:dis?(tip||'Response deadline has passed'):''})).join(''):`<span class="small muted row" style="gap:6px">${icon('lock')}Không có thao tác khả dụng cho vai trò ${esc(labelVi(state.role))}</span>`}</div>
    </div>
  </section>
  ${od?`<div class="mt-4">${alertBox('danger','Thư mời đã quá hạn phản hồi',`Hạn phản hồi là ${fmtDate(o.deadline)} (quá ${-daysBetween(TODAY,o.deadline)} ngày). Không thể đánh dấu đã chấp nhận. Bạn có thể ghi nhận ứng viên từ chối, hủy thư mời hoặc tạo thư mời mới với hạn phản hồi khác.`)}</div>`:''}
  ${o.status==='Declined'&&o.declineReason?`<div class="mt-4">${alertBox('danger','Ứng viên đã từ chối thư mời',esc(o.declineReason))}</div>`:''}
  ${o.status==='Expired'?`<div class="mt-4">${alertBox('neutral','Thư mời đã hết hạn','Hệ thống tự động chuyển trạng thái khi quá hạn phản hồi.')}</div>`:''}
  <div class="detail-grid mt-4">
    <div class="stack">
      <section class="card"><div class="card-header"><h2 class="card-title">Thông tin thư mời</h2></div><div class="card-body"><dl class="dl">
        <div><dt>Ứng viên</dt><dd><a href="#" data-action="openApplicant" data-code="${o.app}">${esc(o.applicant)}</a></dd></div><div><dt>Vị trí</dt><dd>${esc(labelVi(o.position))}</dd></div>
        <div><dt>Phòng ban</dt><dd>${esc(o.dept)}</dd></div><div><dt>Mức lương đề xuất</dt><dd>${money(o.salary)}</dd></div>
        <div><dt>Ngày bắt đầu dự kiến</dt><dd>${fmtDate(o.startDate)}</dd></div><div><dt>Hạn phản hồi</dt><dd class="${od?'text-danger':''}">${fmtDate(o.deadline)}</dd></div>
        <div><dt>Trạng thái thư mời</dt><dd>${badge(o.status)}</dd></div><div><dt>Người tạo</dt><dd>${esc(o.createdBy)}</dd></div>
        <div><dt>Người phê duyệt</dt><dd>${o.approver?esc(o.approver):'<span class="subtle">—</span>'}</dd></div>
      </dl></div></section>
      <section class="card"><div class="card-header"><h2 class="card-title">Điều khoản và điều kiện</h2></div><div class="card-body"><div class="prose">${esc(o.terms)}</div></div></section>
    </div>
    <aside><section class="card"><div class="card-header"><h2 class="card-title">Lịch sử phê duyệt</h2></div><div class="card-body">${auditTimeline(hist)}</div></section></aside>
  </div>`;
};
