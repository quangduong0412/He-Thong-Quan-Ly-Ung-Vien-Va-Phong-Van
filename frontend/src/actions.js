"use strict";

/* =====================================================================
   12. ACTIONS — event delegation qua data-action / data-change / data-input
   ===================================================================== */
var rerender = id => { const map = {req:['#req-results',reqResults], app:['#app-results',appResults], int:['#int-results',intResults], off:['#off-results',()=>offResults()], report:['#report-body',reportBody]}; const [sel,fn]=map[id]; const el=$(sel); if(el) el.innerHTML=fn(); };
function setRole(role){
  state.role = role; state.fb = {}; state.settingsDraft = null;
  toast('info','Đã đổi vai trò',`Đang xem với vai trò ${labelVi(role)} (${currentUser().user}). Menu, thao tác và dữ liệu nhạy cảm đã được cập nhật.`);
  if(!canAccess(state.page)){ state.formDirty=false; navigate('dashboard',{},{force:true}); } else render();
}
async function doReqAction(code, act, button){
  const r = findReq(code), me = currentUser();
  const log = (action, from, to, reason, changes=[]) => AUDIT[r.code].push({actor:me.user, role:state.role, time:nowStamp(), action, from, to, reason, changes});
  if(act==='edit'){ state.form = newFormState(code); state.formErrors={}; state.formDirty=false; navigate('requestForm'); return; }
  if(act==='submit'){
    const ok = await confirmDialog({title:'Gửi yêu cầu để phê duyệt?', message:`${r.code} sẽ được gửi tới trưởng phòng để phê duyệt. Bạn sẽ không thể chỉnh sửa trong lúc chờ duyệt.`, confirmText:'Gửi', ic:'send'});
    if(!ok) return; const from=r.state; r.state='Pending Department Approval'; log(from==='Revision Required'?'Resubmitted':'Submitted for Approval', from, r.state);
    toast('success','Đã gửi yêu cầu phê duyệt',`${r.code} → ${labelVi('Pending Department Approval')}`); render(); return;
  }
  if(act==='approve'){
    await withLoading(button, ()=>{});
    const from = r.state;
    const next = {'Pending Department Approval':'Pending HR Review','Pending HR Review':state.settings.requireGD?'Pending Director Approval':'Approved','Pending Director Approval':'Approved'}[from];
    r.state = next; log('Approved', from, next);
    toast('success','Đã phê duyệt', `${r.code} → ${labelVi(next)}`); render(); return;
  }
  if(act==='revision' || act==='reject'){
    const isRej = act==='reject';
    const reason = await reasonModal({title:isRej?`Từ chối ${r.code}?`:`Yêu cầu chỉnh sửa ${r.code}`, desc:isRej?'Yêu cầu sẽ bị từ chối và kết thúc quy trình.':'Yêu cầu sẽ được trả về cho người đề xuất để chỉnh sửa.', label:isRej?'Lý do từ chối':'Nội dung cần chỉnh sửa', confirmText:isRej?'Xác nhận từ chối':'Yêu cầu chỉnh sửa', tone:isRej?'danger':'primary'});
    if(!reason) return;
    const from = r.state, step = STATE_STEP[from];
    r.state = isRej?'Rejected':'Revision Required'; if(isRej) r.rejectedAt=step; else r.revisionAt=step;
    log(isRej?'Rejected':'Requested Revision', from, r.state, reason);
    toast(isRej?'error':'warning', isRej?'Đã từ chối yêu cầu':'Đã yêu cầu chỉnh sửa', `${r.code} → ${labelVi(r.state)}`); render(); return;
  }
  if(act==='cancel'){
    const ok = await confirmDialog({title:`Hủy ${r.code}?`, message:'Yêu cầu đã được phê duyệt sẽ chuyển sang trạng thái đã hủy. Sau đó bạn có thể tạo bản sửa đổi. Hành động này không thể hoàn tác.', confirmText:'Hủy yêu cầu', cancelText:'Giữ lại', tone:'danger'});
    if(!ok) return; const from=r.state; r.state='Cancelled'; log('Cancelled', from, 'Cancelled');
    toast('warning','Đã hủy yêu cầu',`${r.code} → ${labelVi('Cancelled')}. Dùng chức năng sửa đổi để tạo bản mới.`); render(); return;
  }
  if(act==='amend'){
    const base = r.code.replace(/-\d+$/,'').length===12 ? r.code : r.code; // REQ-2026-001 or REQ-2026-001-1
    const root = r.code.split('-').slice(0,3).join('-');
    const n = REQUESTS.filter(x=>x.code.startsWith(root+'-') && x.code.split('-').length===4).length + 1;
    const copy = clone(r); copy.code = `${root}-${n}`; copy.state='Draft'; copy.amendedFrom=r.code; copy.requestDate=TODAY; copy.comments=[]; copy.revisionAt=null; copy.rejectedAt=null;
    REQUESTS.unshift(copy);
    AUDIT[copy.code] = [{actor:me.user, role:state.role, time:nowStamp(), action:'Amended', from:null, to:'Draft', changes:[['Amended From','—',r.code]]}];
    log('Amended', null, null, null, [['Amendment',`—`,copy.code]]);
    toast('success','Đã tạo bản sửa đổi',`${copy.code} (bản nháp) được tạo từ ${r.code}`); navigate('requestDetail',{code:copy.code}); return;
  }
}
async function doOfferAction(code, act, button){
  const o = findOffer(code), me = currentUser();
  o.history = o.history || [];
  const log = (action, from, to, reason) => o.history.push({actor:me.user, role:state.role, time:nowStamp(), action, from, to, reason, changes:[]});
  const a = findApp(o.app);
  if(act==='decline'){
    const reason = await reasonModal({title:`Đánh dấu ${o.code} là đã từ chối`, desc:`${o.applicant} từ chối thư mời nhận việc.`, label:'Lý do từ chối', confirmText:'Xác nhận từ chối'});
    if(!reason) return; const from=o.status; o.status='Declined'; o.declineReason=reason; a.stage='Rejected'; a.rejectReason='Từ chối thư mời: '+reason; log('Marked as Declined', from, 'Declined', reason);
    toast('warning','Ứng viên đã từ chối thư mời',`${o.code} · ${o.applicant}`); render(); return;
  }
  if(act==='cancel'){
    const ok = await confirmDialog({title:`Hủy ${o.code}?`, message:'Thư mời sẽ bị hủy và không thể gửi lại.', confirmText:'Hủy thư mời', cancelText:'Giữ lại', tone:'danger'}); if(!ok) return;
    const from=o.status; o.status='Cancelled'; log('Cancelled', from, 'Cancelled'); toast('warning','Đã hủy thư mời',o.code); render(); return;
  }
  if(act==='accept'){
    const ok = await confirmDialog({title:'Đánh dấu đã chấp nhận?', message:`${o.applicant} sẽ chuyển sang trạng thái đã tuyển và số ứng viên được tuyển của yêu cầu sẽ tăng thêm 1.`, confirmText:'Đánh dấu đã chấp nhận', tone:'success', ic:'userCheck'}); if(!ok) return;
  }
  await withLoading(button, ()=>{});
  const map = {submit:['Pending Approval','Đã gửi phê duyệt'], approve:['Approved','Đã phê duyệt'], send:['Sent','Đã gửi'], accept:['Accepted','Đã đánh dấu chấp nhận']};
  const [to, label] = map[act]; const from = o.status; o.status = to; log(label, from, to);
  if(act==='approve') o.approver = me.user;
  if(act==='send') a.stage = 'Offer Sent';
  if(act==='accept'){ a.stage='Hired'; const r=findReq(a.reqCode); if(r) r.hired=Math.min(r.headcount, r.hired+1); }
  toast('success', label, `${o.code} → ${labelVi(to)}`); render();
}

var ACTIONS = {
  noop(){},
  go(el){ applyPreset(el.dataset.preset); navigate(el.dataset.page, el.dataset.params?JSON.parse(el.dataset.params):{}); },
  back(el){ navigate(el.dataset.page); },
  toggleSidebar(){ if(isMobile()){ $('#app').classList.contains('mobile-nav-open')?closeMobileNav():openMobileNav(); } else { state.collapsed=!state.collapsed; applyLayout(); renderHeader(); } },
  closeMobileNav(){ closeMobileNav(); },
  toggleTheme(){ state.theme = state.theme==='dark'?'light':'dark'; document.documentElement.setAttribute('data-theme', state.theme); try{ localStorage.setItem('rms-theme', state.theme); }catch(e){} renderHeader(); toast('info', state.theme==='dark'?'Đã bật giao diện tối':'Đã bật giao diện sáng'); },
  toggleMobileSearch(){ const h=$('#header'); h.classList.toggle('search-open'); if(h.classList.contains('search-open')) $('#global-search').focus(); },
  openUserMenu(el){
    const u = currentUser();
    const real = SESSION && SESSION.role;
    openMenu(el, [
      {html:`<div class="menu-user">${avatarOf(u)}<div class="person-text"><strong>${esc(u.user)}</strong><span>${esc(u.title)}</span></div></div>`},
      {divider:true},
      {header: real ? 'Đổi vai trò (mô phỏng)' : 'Vai trò (mô phỏng)'},
      ...ROLES.map(r=>({
        label:labelVi(r.key), icon:'shield', action:'setRole', data:{role:r.key},
        checked:r.key===state.role, hint:r.key===real?'vai trò thật':'',
      })),
      {divider:true},
      {label:'Hồ sơ cá nhân', icon:'user', action:'mockProfile'},
      {label:state.theme==='dark'?'Giao diện sáng':'Giao diện tối', icon:state.theme==='dark'?'sun':'moon', action:'toggleTheme'},
      {label:'Đăng xuất', icon:'logout', action:'signOut', danger:true},
    ], {width:270});
  },
  setRole(el){ closeMenu(); setRole(el.dataset.role); },
  openNotifications(el){
    openMenu(el, [{html:`<div class="row between" style="padding:6px 10px"><strong>Thông báo</strong><button class="btn btn-ghost btn-sm" data-action="markAllRead">Đánh dấu tất cả đã đọc</button></div>`},{divider:true},
      ...NOTIFICATIONS.map(n=>({html:`<button class="notif-item ${n.unread?'unread':''}" role="menuitem" data-action="openNotif" data-id="${n.id}"><span class="stat-icon tone-${n.tone}" style="width:32px;height:32px;border-radius:8px">${icon(n.icon)}</span><span><div class="t">${esc(n.text)}</div><div class="time">${esc(n.time)}</div></span></button>`}))], {width:360});
  },
  markAllRead(){ NOTIFICATIONS.forEach(n=>n.unread=false); closeMenu(); renderHeader(); toast('success','Đã đánh dấu tất cả thông báo là đã đọc'); },
  openNotif(el){ const n=NOTIFICATIONS.find(x=>x.id==el.dataset.id); n.unread=false; closeMenu(); navigate(n.go[0], n.go[1]); },
  mockProfile(){ closeMenu(); toast('info','Hồ sơ','Trang hồ sơ cá nhân hiện nằm ngoài phạm vi bản mẫu.'); },
  signOut(){
    closeMenu();
    const who = SESSION ? SESSION.id : null;
    confirmDialog({
      title:'Đăng xuất?',
      message: who ? `Bạn sẽ đăng xuất khỏi tài khoản ${who} và quay về trang đăng nhập.` : 'Bạn sẽ quay về trang đăng nhập.',
      confirmText:'Đăng xuất', tone:'danger',
    }).then(ok=>{ if(ok){ toast('info','Đang đăng xuất…'); frappeLogout(); } });
  },
  setTab(el){
    const ns=el.dataset.ns, t=el.dataset.tab;
    if(ns==='request'){ state.tab.request=t; render(); $(`#tab-request-${t}`).focus(); }
    else if(ns==='applicant'){ state.tab.applicant=t; render(); $(`#tab-applicant-${t}`).focus(); }
    else if(ns==='report'){ state.rep.tab=t; render(); $(`#tab-report-${t}`).focus(); simulateReportLoad(); }
    else { $$('.tab', el.parentElement).forEach(b=>{b.classList.toggle('active',b===el); b.setAttribute('aria-selected',b===el);}); }
  },
  /* Requests */
  newRequest(){ state.form = newFormState(); state.formErrors={}; state.formDirty=false; navigate('requestForm'); },
  openRequest(el, e){ if(e) e.preventDefault(); navigate('requestDetail',{code:el.dataset.code}); },
  async applyReqFilter(){
    const v = id => $('#'+id).value;
    state.req.filters = {search:v('rf-search'), state:v('rf-state'), dept:v('rf-dept'), priority:v('rf-priority'), empType:v('rf-emp'), from:v('rf-from'), to:v('rf-to')};
    if(state.req.filters.from && state.req.filters.to && state.req.filters.from>state.req.filters.to){ setFieldError($('#req-filters'),'rf-to','Ngày kết thúc phải sau ngày bắt đầu.'); return; }
    setFieldError($('#req-filters'),'rf-to',null);
    state.req.page=1; state.req.busy=true; rerender('req'); $('#req-selection').innerHTML='Đang tải…';
    await sleep(600); state.req.busy=false; rerender('req'); $('#req-selection').innerHTML=selectionText();
  },
  resetReqFilter(){ state.req.filters={search:'',state:'',dept:'',priority:'',empType:'',from:'',to:''}; state.req.page=1; render(); toast('info','Đã xóa bộ lọc'); },
  selectReq(el){ const c=el.dataset.code; state.req.selected.has(c)?state.req.selected.delete(c):state.req.selected.add(c); rerender('req'); $('#req-selection').innerHTML=selectionText(); },
  selectAllReq(el){ const rows = paginate(filterRequests(),'req'); const all = rows.every(r=>state.req.selected.has(r.code)); rows.forEach(r=> all?state.req.selected.delete(r.code):state.req.selected.add(r.code)); rerender('req'); $('#req-selection').innerHTML=selectionText(); },
  clearSelection(){ state.req.selected.clear(); rerender('req'); $('#req-selection').innerHTML=selectionText(); },
  bulkExport(){ const rows=REQUESTS.filter(r=>state.req.selected.has(r.code)); downloadCSV('yeu_cau_tuyen_dung_da_chon.csv',['Mã yêu cầu','Vị trí','Phòng ban','Số lượng cần tuyển','Đã tuyển','Mức độ ưu tiên','Trạng thái','Ngày yêu cầu','Ngày bắt đầu dự kiến'],rows.map(r=>[r.code,labelVi(r.position),r.dept,r.headcount,r.hired,labelVi(r.priority),labelVi(r.state),r.requestDate,r.startDate])); },
  exportRequests(){ const rows=filterRequests(); downloadCSV('yeu_cau_tuyen_dung.csv',['Mã yêu cầu','Vị trí','Phòng ban','Số lượng cần tuyển','Đã tuyển','Mức độ ưu tiên','Trạng thái','Ngày yêu cầu','Ngày bắt đầu dự kiến'],rows.map(r=>[r.code,labelVi(r.position),r.dept,r.headcount,r.hired,labelVi(r.priority),labelVi(r.state),r.requestDate,r.startDate])); },
  reqMenu(el){
    const r = findReq(el.dataset.code), A = reqActions(r);
    openMenu(el, [
      {label:'Xem chi tiết', icon:'eye', action:'openRequest', data:{code:r.code}},
      {label:'Chỉnh sửa', icon:'edit', action:'reqAction', data:{act:'edit',code:r.code}, disabled:!A.includes('edit'), tip:A.includes('edit')?'':'Chỉ có thể chỉnh sửa bản nháp hoặc yêu cầu cần chỉnh sửa'},
      {label:'Sao chép thành yêu cầu mới', icon:'copy', action:'dupRequest', data:{code:r.code}, disabled:!PERM.createRequest()},
      {label:'Tải PDF', icon:'download', action:'mockDownload', data:{name:r.code+'.pdf'}},
      {divider:true},
      {label:'Hủy yêu cầu', icon:'xCircle', action:'reqAction', data:{act:'cancel',code:r.code}, danger:true, disabled:!A.includes('cancel'), tip:'Chỉ quản lý nhân sự mới có thể hủy yêu cầu đã được phê duyệt'},
    ]);
  },
  dupRequest(el){ closeMenu(); const f=newFormState(el.dataset.code); f.code=null; f.title+=' (bản sao)'; state.form=f; state.formErrors={}; state.formDirty=true; navigate('requestForm'); toast('info','Đã sao chép','Dữ liệu đã được sao chép sang biểu mẫu mới. Vui lòng kiểm tra và lưu.'); },
  reqAction(el){ closeMenu(); doReqAction(el.dataset.code, el.dataset.act, el); },
  postComment(el){ const ta=$('#new-comment'); const v=ta.value.trim(); if(!v){ setFieldError($('#main'),'new-comment','Nội dung bình luận không được để trống.'); ta.focus(); return; } findReq(el.dataset.code).comments.push({by:currentUser().user, at:nowStamp(), text:v}); render(); toast('success','Đã gửi bình luận'); },
  /* Form */
  addCrit(){ state.form.criteria.push({name:'',desc:'',weight:'',mandatory:false,minReq:'',method:'Interview'}); markDirty(); $('#crit-body').innerHTML=critRows(); updateCritSummary(); const rows=$$('#crit-body tr'); rows[rows.length-1].querySelector('input').focus(); },
  delCrit(el){ const i=+el.dataset.idx; const name=state.form.criteria[i].name||`dòng ${i+1}`; state.form.criteria.splice(i,1); Object.keys(state.formErrors).filter(k=>k.startsWith('crit_')).forEach(k=>delete state.formErrors[k]); markDirty(); $('#crit-body').innerHTML=critRows(); updateCritSummary(); toast('info','Đã xóa tiêu chí',name); },
  async saveDraft(el){
    state.formErrors = validateRequestForm(false);
    if(Object.keys(state.formErrors).length){ render(); focusFirstError(); return; }
    await withLoading(el, ()=>{ const code = persistForm('Draft'); toast('success','Draft saved',`${code} đã được lưu nháp.`); state.formDirty=false; navigate('requestDetail',{code},{force:true}); });
  },
  async submitForm(el){
    state.formErrors = validateRequestForm(true);
    if(Object.keys(state.formErrors).length){ render(); focusFirstError(); toast('error','Thông tin chưa hợp lệ',`${Object.keys(state.formErrors).length} lỗi cần sửa trước khi gửi.`); return; }
    const ok = await confirmDialog({title:'Gửi yêu cầu để phê duyệt?', message:'Yêu cầu sẽ được gửi tới trưởng phòng. Bạn sẽ không thể chỉnh sửa trong lúc chờ duyệt.', confirmText:'Gửi', ic:'send'});
    if(!ok) return;
    await withLoading($('#btn-submit-form'), ()=>{ const code = persistForm('Pending Department Approval'); toast('success','Đã gửi yêu cầu phê duyệt',`${code} → ${labelVi('Pending Department Approval')}`); state.formDirty=false; navigate('requestDetail',{code},{force:true}); });
  },
  cancelForm(){ const back = state.form && state.form.code ? ['requestDetail',{code:state.form.code}] : ['requests',{}]; navigate(back[0], back[1]); },
  /* Applicants */
  openApplicant(el, e){ if(e) e.preventDefault(); navigate('applicantDetail',{code:el.dataset.code}); },
  setAppView(el){ state.app.view=el.dataset.view; render(); },
  resetAppFilter(){ state.app.filters={search:'',position:'',dept:'',status:'',source:'',hr:''}; state.app.page=1; render(); },
  appMenu(el){
    const a = findApp(el.dataset.code), m = PERM.manageApplicants(), closed=['Rejected','Hired'].includes(a.stage);
    openMenu(el, [
      {label:'Xem hồ sơ', icon:'eye', action:'openApplicant', data:{code:a.code}},
      {label:'Lên lịch phỏng vấn', icon:'calendar', action:'openSchedule', data:{app:a.code}, disabled:!PERM.scheduleInterview()||closed},
      {label:'Tạo thư mời nhận việc', icon:'briefcase', action:'openNewOffer', data:{app:a.code}, disabled:!PERM.manageOffers()||a.stage!=='Passed'},
      {label:'Gửi email', icon:'mail', action:'mockEmail', data:{name:a.name}},
      {label:'Tải hồ sơ ứng viên', icon:'download', action:'mockDownload', data:{name:`CV_${a.code}.pdf`}},
      {divider:true},{header:'Chuyển sang vòng tuyển dụng'},
      ...['Screening','Interview Scheduled','Interviewing','Passed'].map(s=>({label:labelVi(s), icon:'arrowRight', action:'moveStage', data:{code:a.code, stage:s}, disabled:!m||a.stage===s||closed, checked:a.stage===s})),
      {divider:true},
      {label:'Từ chối ứng viên', icon:'userX', action:'rejectApplicant', data:{code:a.code}, danger:true, disabled:!m||closed},
    ], {width:240});
  },
  moveStage(el){ closeMenu(); const a=findApp(el.dataset.code); const from=a.stage; a.stage=el.dataset.stage; a.audit=(a.audit||[]); a.audit.push({actor:currentUser().user,role:state.role,time:nowStamp(),action:'Stage changed',from,to:a.stage,changes:[]}); toast('success','Đã cập nhật giai đoạn',`${a.name}: ${labelVi(from)} → ${labelVi(a.stage)}`); render(); },
  async rejectApplicant(el){
    closeMenu(); const a=findApp(el.dataset.code);
    const reason = await reasonModal({title:`Từ chối ${a.name}?`, desc:'Ứng viên sẽ được chuyển sang trạng thái đã từ chối.', label:'Lý do từ chối', confirmText:'Từ chối ứng viên'});
    if(!reason) return; const from=a.stage; a.stage='Rejected'; a.rejectReason=reason; a.audit=(a.audit||[]); a.audit.push({actor:currentUser().user,role:state.role,time:nowStamp(),action:'Rejected',from,to:'Rejected',changes:[],reason});
    toast('error','Đã từ chối ứng viên',a.name); render();
  },
  openSchedule(el){ closeMenu(); closeDrawer(true); openScheduleModal({app:el.dataset.app}); },
  /* Interviews */
  setIntView(el){ state.int.view=el.dataset.view; render(); },
  resetIntFilter(){ state.int.filters={date:'',interviewer:'',round:'',status:'',method:'',feedback:''}; render(); },
  calWeek(el){ const d=+el.dataset.dir; state.int.weekStart = d===0 ? '2026-11-09' : addDays(state.int.weekStart, d*7); rerender('int'); },
  interviewDrawer(el){ closeMenu(); interviewDrawer(el.dataset.code); },
  closeDrawer(){ closeDrawer(); },
  intMenu(el){
    const i = findInt(el.dataset.code), m = PERM.scheduleInterview(), active = ['Scheduled','In Progress'].includes(i.status);
    openMenu(el, [
      {label:'Xem chi tiết', icon:'eye', action:'interviewDrawer', data:{code:i.code}},
      {label:'Nhận xét', icon:'message', action:'openFeedback', data:{code:i.code}, disabled:!['Completed','In Progress'].includes(i.status)},
      {label:'Đổi lịch', icon:'calendar', action:'reschedule', data:{code:i.code}, disabled:!m||!active},
      {label:'Đánh dấu đã hoàn thành', icon:'checkCircle', action:'setIntStatus', data:{code:i.code,status:'Completed'}, disabled:!m||!active},
      {label:'Đánh dấu vắng mặt', icon:'userX', action:'setIntStatus', data:{code:i.code,status:'No Show'}, disabled:!m||!active},
      {divider:true},
      {label:'Hủy phỏng vấn', icon:'xCircle', action:'cancelInterview', data:{code:i.code}, danger:true, disabled:!m||!active},
    ]);
  },
  reschedule(el){ closeMenu(); openScheduleModal({code:el.dataset.code}); },
  setIntStatus(el){ closeMenu(); const i=findInt(el.dataset.code); i.status=el.dataset.status; toast('success','Đã cập nhật buổi phỏng vấn',`${i.code} → ${labelVi(i.status)}`); render(); },
  async cancelInterview(el){ closeMenu(); const i=findInt(el.dataset.code); const ok=await confirmDialog({title:`Hủy ${i.code}?`, message:`Lịch ${i.round} với ${findApp(i.app).name} sẽ bị hủy và email thông báo sẽ được gửi tới các bên.`, confirmText:'Hủy phỏng vấn', cancelText:'Giữ lại', tone:'danger'}); if(!ok) return; i.status='Cancelled'; toast('warning','Đã hủy phỏng vấn',i.code); render(); },
  openFeedback(el){ closeMenu(); closeDrawer(true); navigate('feedback',{code:el.dataset.code}); },
  fbSaveDraft(el){ withLoading(el, ()=>{ const i=findInt(state.params.code); const d=fbDraft(i); d.status='Draft'; toast('success','Đã lưu bản nháp','Nhận xét nháp đã được lưu.'); }, 500); },
  async fbSubmit(){
    const i=findInt(state.params.code), d=fbDraft(i), crit=criteriaForInterview(i), main=$('#main');
    let bad=false;
    crit.forEach((c,k)=>{ const v=d.scores[k]; const msg = (v===''||v==null) ? 'Bắt buộc nhập' : null; setFieldError(main,`score-${k}`,msg); if(msg) bad=true; });
    const recWrap = main.querySelector('[data-field="fb-rec"] .field-msg'); recWrap.innerHTML = d.rec ? '' : `<span class="error-msg">${icon('alertCircle')}Vui lòng chọn đề xuất tuyển dụng.</span>`; if(!d.rec) bad=true;
    const ov = d.overall.trim(); setFieldError(main,'fb-overall', ov.length<10 ? 'Vui lòng nhập nhận xét tổng quan (ít nhất 10 ký tự).' : null); if(ov.length<10) bad=true;
    if(bad){ toast('error','Nhận xét chưa hoàn tất','Vui lòng nhập đầy đủ điểm, đề xuất tuyển dụng và nhận xét tổng quan.'); const f=main.querySelector('.has-error input,.has-error textarea'); f&&f.focus(); return; }
    const {total, pass} = fbCalc(crit,d,70);
    const ok = await confirmDialog({title:'Gửi nhận xét?', message:`Tổng điểm <strong>${total}/100</strong> · Kết quả dự kiến <strong>${pass?'Đạt':'Không đạt'}</strong> · ${esc(labelVi(d.rec))}.<br>Sau khi gửi, bạn không thể chỉnh sửa nhận xét này.`, confirmText:'Gửi nhận xét', ic:'send'});
    if(!ok) return;
    d.status='Submitted'; d.submittedAt=nowStamp(); i.feedback[currentUser().user]=clone(d);
    if(i.status==='In Progress') i.status='Completed';
    toast('success','Đã gửi nhận xét',`${findApp(i.app).name} · ${total}/100`); render(); window.scrollTo(0,0);
  },
  /* Offers */
  openOffer(el, e){ if(e) e.preventDefault(); navigate('offerDetail',{code:el.dataset.code}); },
  openNewOffer(el){ closeMenu(); if(!PERM.manageOffers()){ toast('error','Bạn không có quyền thực hiện thao tác này'); return; } openNewOfferModal({app:el.dataset.app}); },
  offerAction(el){ closeMenu(); doOfferAction(el.dataset.code, el.dataset.act, el); },
  resetOffFilter(){ state.off.filters={search:'',status:''}; render(); },
  exportOffers(){ const rows=filterOffers(); downloadCSV('thu_moi_nhan_viec.csv',['Mã thư mời','Ứng viên','Vị trí','Phòng ban','Mức lương','Ngày bắt đầu','Hạn phản hồi','Trạng thái'],rows.map(o=>[o.code,o.applicant,labelVi(o.position),o.dept,PERM.seeSalary()?o.salary:'***',o.startDate,o.deadline,labelVi(o.status)])); },
  offMenu(el){
    const o=findOffer(el.dataset.code), A=offerActions(o).map(x=>x[0]);
    openMenu(el, [
      {label:'Xem thư mời', icon:'eye', action:'openOffer', data:{code:o.code}},
      {label:'Xem hồ sơ ứng viên', icon:'user', action:'openApplicant', data:{code:o.app}},
      {label:'Tải PDF', icon:'download', action:'mockDownload', data:{name:o.code+'.pdf'}},
      {divider:true},
      {label:'Hủy thư mời', icon:'xCircle', action:'offerAction', data:{act:'cancel',code:o.code}, danger:true, disabled:!A.includes('cancel')},
    ]);
  },
  /* Reports */
  applyReport(){ state.rep.period=$('#rp-period').value; state.rep.dept=$('#rp-dept').value; simulateReportLoad(); },
  resetReport(){ state.rep.period='quarter'; state.rep.dept=''; state.rep.empty=false; render(); },
  exportReport(){ if(state.rep.empty||state.rep.dept==='Phòng Tài chính'){ toast('warning','Không có dữ liệu để xuất','Không có dữ liệu cho bộ lọc hiện tại.'); return; } const d=reportData(state.rep.tab); downloadCSV(`bao_cao_${state.rep.tab}_${state.rep.period}.csv`, d.cols.map(labelVi), d.rows); },
  /* Settings */
  async saveSettings(el){
    const s = state.settingsDraft, main=$('#main');
    const dErr = !(s.duration>=1 && s.duration<=365) ? 'Giá trị phải nằm trong khoảng từ 1 đến 365.' : null;
    const mErr = !(s.maxEmployees>=1 && s.maxEmployees<=100) ? 'Giá trị phải nằm trong khoảng từ 1 đến 100.' : null;
    setFieldError(main,'st-duration',dErr); setFieldError(main,'st-max',mErr);
    if(dErr||mErr){ toast('error','Cài đặt không hợp lệ','Vui lòng kiểm tra lại các giá trị được đánh dấu.'); return; }
    await withLoading(el, ()=>{ state.settings = clone(s); toast('success','Đã lưu cài đặt','Cài đặt tuyển dụng đã được cập nhật.'); });
  },
  async resetSettings(){ const ok = await confirmDialog({title:'Đặt lại cài đặt?', message:'Khôi phục các giá trị mặc định của hệ thống. Bạn vẫn cần bấm Lưu thay đổi để áp dụng.', confirmText:'Đặt lại', tone:'warning'}); if(!ok) return; state.settingsDraft = clone(DEFAULT_SETTINGS); render(); toast('info','Đã khôi phục mặc định','Bấm Lưu thay đổi để lưu.'); },
  /* Misc / mocks */
  toggleFilters(el){ const ns=el.dataset.ns; state[ns].showFilters=!state[ns].showFilters; const panel=$(`#${ns}-filters`); panel.classList.toggle('show', state[ns].showFilters); el.setAttribute('aria-expanded', state[ns].showFilters); },
  page(el){ const ns=el.dataset.ns; state[ns].page=+el.dataset.page; rerender(ns); },
  mockDownload(el){ closeMenu(); toast('info','Đang tải xuống (mô phỏng)', el.dataset.name||'tệp'); },
  mockUpload(){ toast('info','Tải tệp lên (mô phỏng)','Bản mẫu không lưu tệp. Trong Frappe, sử dụng /api/method/upload_file.'); },
  mockPreview(){ openModal({title:'Xem trước hồ sơ', size:'lg', body:`<div class="empty"><div class="empty-icon">${icon('file')}</div><h3>Khu vực xem trước PDF</h3><p>Trong phiên bản thực tế, nhúng &lt;iframe&gt; tới URL tệp trên Frappe.</p></div>`, footer:`<button class="btn btn-secondary" data-modal-close-btn onclick="closeModal()">Đóng</button>`}); },
  mockEmail(el){ closeMenu(); toast('success','Đã đưa email vào hàng đợi (mô phỏng)',`Gửi tới ${el.dataset.name}`); },
  mockJoin(el, e){ if(e) e.preventDefault(); toast('info','Mở cuộc họp (mô phỏng)','Bản mẫu không mở liên kết cuộc họp thực tế.'); },
  mockAddApplicant(){ toast('info','Thêm ứng viên','Biểu mẫu tạo ứng viên tương tự biểu mẫu yêu cầu tuyển dụng — hiện nằm ngoài phạm vi bản mẫu.'); },
};
var CHANGES = {
  pageSize(el){ const ns=el.dataset.ns; state[ns].size=+el.value; state[ns].page=1; rerender(ns); },
  toggleReqLoading(el){ state.req.simLoading = el.checked; rerender('req'); toast('info', el.checked?'Đã bật hiệu ứng tải':'Đã tắt hiệu ứng tải'); },
  toggleRepEmpty(el){ state.rep.empty = el.checked; rerender('report'); },
  formField(el){ setFormValue(el.dataset.name, el.value); },
  critField(el){ const c=state.form.criteria[+el.dataset.idx]; c[el.dataset.key] = el.type==='checkbox' ? el.checked : el.value; markDirty(); updateCritSummary(); },
  loadCritTemplate(el){ if(!el.value) return; state.form.criteria = clone(CRIT[el.value]); Object.keys(state.formErrors).filter(k=>k.startsWith('crit')).forEach(k=>delete state.formErrors[k]); markDirty(); $('#crit-body').innerHTML=critRows(); updateCritSummary(); toast('info','Đã tải bộ tiêu chí',`${state.form.criteria.length} tiêu chí · tổng trọng số 100%`); el.value=''; },
  appFilter(el){ state.app.filters[el.dataset.key]=el.value; state.app.page=1; rerender('app'); updateAppCount(); },
  intFilter(el){ state.int.filters[el.dataset.key]=el.value; rerender('int'); AFTER.interviews(); },
  offFilter(el){ state.off.filters[el.dataset.key]=el.value; rerender('off'); },
  fbRec(el){ fbDraft(findInt(state.params.code)).rec = el.value; const m=$('[data-field="fb-rec"] .field-msg'); if(m) m.innerHTML=''; },
  settingField(el){ const s=state.settingsDraft; const k=el.dataset.key; s[k] = el.type==='checkbox' ? el.checked : (el.type==='number' ? Number(el.value) : el.value); if(el.type==='checkbox'){ const lbl=el.nextElementSibling; lbl.textContent = {requireSalary:['Bắt buộc','Không bắt buộc'],requireGD:['Bật','Tắt'],allowUrgent:['Cho phép','Không cho phép']}[k][el.checked?0:1]; } },
};
var INPUTS = {
  formField(el){ setFormValue(el.dataset.name, el.value); },
  critField(el){ const i=+el.dataset.idx, k=el.dataset.key; state.form.criteria[i][k] = el.value; markDirty(); if(state.formErrors[`crit_${i}_${k}`]){ delete state.formErrors[`crit_${i}_${k}`]; el.classList.remove('is-error'); el.removeAttribute('aria-invalid'); const m=el.closest('td').querySelector('.cell-error'); m&&m.remove(); } if(k==='weight') updateCritSummary(); },
  appFilter(el){ CHANGES.appFilter(el); },
  offFilter(el){ CHANGES.offFilter(el); },
  settingField(el){ CHANGES.settingField(el); setFieldError($('#main'), el.id, null); },
  fbScore(el){
    const i=findInt(state.params.code), d=fbDraft(i), k=+el.dataset.idx, max=+el.dataset.max;
    let v = el.value; let msg=null;
    if(v!==''){ let n=Number(v); if(n>max){ n=max; msg=`Điểm không thể vượt quá điểm tối đa (${max}). Đã điều chỉnh thành ${max}.`; } if(n<0){ n=0; msg='Điểm không thể là số âm.'; } if(!Number.isInteger(n)){ n=Math.round(n); } if(String(n)!==v) el.value=n; v=n; }
    d.scores[k] = v; setFieldError($('#main'), `score-${k}`, msg);
    $('#fb-summary').innerHTML = fbSummary(criteriaForInterview(i), d, 70);
  },
  fbComment(el){ fbDraft(findInt(state.params.code)).comments[+el.dataset.idx] = el.value; },
  fbOverall(el){ fbDraft(findInt(state.params.code)).overall = el.value; if(el.value.trim().length>=10) setFieldError($('#main'),'fb-overall',null); },
};
function setFormValue(name, value){
  const numeric = ['headcount','salaryMin','salaryMax'];
  state.form[name] = numeric.includes(name) ? (value===''?'':Number(value)) : value;
  if(state.formErrors[name]){ delete state.formErrors[name]; setFieldError($('#main'),'rf2-'+name,null); }
  if(name==='salaryMin' && state.formErrors.salaryMax){ delete state.formErrors.salaryMax; setFieldError($('#main'),'rf2-salaryMax',null); }
  markDirty();
}
function markDirty(){ if(state.formDirty) return; state.formDirty=true; const b=$('#dirty-banner'); if(b) b.hidden=false; const t=$('#dirty-text'); if(t) t.textContent='Có thay đổi chưa lưu'; }
function updateCritSummary(){ const w=$('#weight-total'); if(w) w.innerHTML=weightBadge(state.form.criteria); const m=$('#mandatory-ind'); if(m) m.innerHTML=mandatoryInd(); }
function focusFirstError(){ setTimeout(()=>{ const el = $('#main .is-error, #main .has-error .input, #main .has-error .select, #main .has-error .textarea') || $('#form-error-summary'); if(el){ el.scrollIntoView({block:'center'}); el.focus && el.focus(); } },30); }
function persistForm(newState){
  const f = state.form, me = currentUser();
  const fields = {title:f.title,dept:f.dept,category:f.category||'New Position',position:f.position||f.title,headcount:Number(f.headcount)||1,startDate:f.startDate||addDays(TODAY,30),empType:f.empType,priority:f.priority,reason:f.reason,jd:f.jd,salaryMin:Number(f.salaryMin)||0,salaryMax:Number(f.salaryMax)||0,criteria:clone(f.criteria)};
  if(f.code){
    const r = findReq(f.code), from=r.state;
    const labels = {title:'Tiêu đề yêu cầu',position:'Vị trí',headcount:'Số lượng nhân sự',startDate:'Ngày dự kiến bắt đầu',priority:'Mức độ ưu tiên',empType:'Hình thức làm việc',dept:'Phòng ban',salaryMin:'Mức lương tối thiểu',salaryMax:'Mức lương tối đa'};
    const changes = Object.keys(labels).filter(k=>String(r[k])!==String(fields[k])).map(k=>[labels[k], k.startsWith('salary')?fmtMoney(r[k]):String(r[k]), k.startsWith('salary')?fmtMoney(fields[k]):String(fields[k])]);
    const sensitive = changes.map((c,i)=>/Salary/.test(c[0])?i:-1).filter(i=>i>=0);
    Object.assign(r, fields);
    if(changes.length) AUDIT[r.code].push({actor:me.user,role:state.role,time:nowStamp(),action:'Updated',from:null,to:null,changes,sensitive});
    if(newState!=='Draft'){ r.state=newState; AUDIT[r.code].push({actor:me.user,role:state.role,time:nowStamp(),action:from==='Revision Required'?'Resubmitted':'Submitted for Approval',from,to:newState,changes:[]}); }
    return r.code;
  }
  const n = Math.max(...REQUESTS.map(r=>parseInt(r.code.split('-')[2],10))) + 1;
  const code = `REQ-2026-${String(n).padStart(3,'0')}`;
  const r = {code, ...fields, hired:0, state:'Draft', requestDate:TODAY, requester:me.user, comments:[], revisionAt:null, rejectedAt:null};
  REQUESTS.unshift(r);
  AUDIT[code] = [{actor:me.user,role:state.role,time:nowStamp(),action:'Created',from:null,to:'Draft',changes:[]}];
  if(newState!=='Draft'){ r.state=newState; AUDIT[code].push({actor:me.user,role:state.role,time:nowStamp(),action:'Submitted for Approval',from:'Draft',to:newState,changes:[]}); }
  return code;
}
async function simulateReportLoad(){ state.rep.busy=true; rerender('report'); await sleep(650); state.rep.busy=false; rerender('report'); }

/* Global search */
function hideSearch(){ const r=$('#search-results'); if(r) r.hidden=true; $('#header').classList.remove('search-open'); }
function runSearch(q){
  const box = $('#search-results'); const n = norm(q.trim());
  if(!n){ box.hidden=true; return; }
  const apps = APPLICANTS.filter(a=>norm(`${a.name} ${a.code} ${a.email}`).includes(n)).slice(0,5);
  const reqs = REQUESTS.filter(r=>canAccess('requests') && norm(`${r.code} ${r.position}`).includes(n)).slice(0,4);
  const offs = OFFERS.filter(o=>canAccess('offers') && norm(`${o.code} ${o.applicant}`).includes(n)).slice(0,3);
  const item = (act, code, title, sub, ic) => `<button class="search-item" role="option" data-action="${act}" data-code="${code}">${ic}<span class="person-text"><strong>${esc(title)}</strong><span>${esc(sub)}</span></span></button>`;
  box.innerHTML = (apps.length?`<div class="search-group">Ứng viên</div>${apps.map(a=>item('openApplicant',a.code,a.name,`${a.code} · ${labelVi(a.position)}`,avatar(a.name,'sm'))).join('')}`:'')
    + (reqs.length?`<div class="search-group">Yêu cầu tuyển dụng</div>${reqs.map(r=>item('openRequest',r.code,labelVi(r.position),`${r.code} · ${labelVi(r.state)}`,`<span class="stat-icon tone-primary" style="width:26px;height:26px;border-radius:6px">${icon('file')}</span>`)).join('')}`:'')
    + (offs.length?`<div class="search-group">Thư mời nhận việc</div>${offs.map(o=>item('openOffer',o.code,o.applicant,`${o.code} · ${labelVi(o.status)}`,`<span class="stat-icon tone-success" style="width:26px;height:26px;border-radius:6px">${icon('briefcase')}</span>`)).join('')}`:'')
    || `<div class="empty" style="padding:24px 12px"><p>Không tìm thấy kết quả cho “${esc(q)}”</p></div>`;
  box.hidden=false;
}
