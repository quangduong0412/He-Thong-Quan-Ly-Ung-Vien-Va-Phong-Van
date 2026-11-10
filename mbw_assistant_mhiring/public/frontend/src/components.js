"use strict";

"use strict";
/* =====================================================================
   5. PERMISSIONS — mô phỏng Role Permission của Frappe
   ===================================================================== */
var has = (...roles) => roles.includes(state.role) || state.role==='System Manager';
var PERM = {
  seeSalary:        () => has('HR Officer','HR Manager','General Director'),
  seeFeedback:      () => has('HR Officer','HR Manager','General Director','Department Manager'),
  createRequest:    () => has('Recruitment Requester','Department Manager','HR Manager'),
  manageApplicants: () => has('HR Officer','HR Manager'),
  scheduleInterview:() => has('HR Officer','HR Manager'),
  manageOffers:     () => has('HR Officer','HR Manager'),
  approveOffer:     () => has('HR Manager','General Director'),
  editSettings:     () => has('HR Manager'),
  viewSettings:     () => has('HR Manager','HR Officer','General Director'),
  exportData:       () => !['Interviewer','Recruitment Requester'].includes(state.role),
};
var NAV = [
  {key:'dashboard',label:'Tổng quan',icon:'home'},
  {key:'requests',label:'Yêu cầu tuyển dụng',icon:'file'},
  {key:'applicants',label:'Ứng viên',icon:'users'},
  {key:'interviews',label:'Phỏng vấn',icon:'calendar'},
  {key:'offers',label:'Thư mời nhận việc',icon:'briefcase'},
  {key:'reports',label:'Báo cáo',icon:'chart'},
  {key:'settings',label:'Cài đặt',icon:'settings',section:'Hệ thống'},
];
var ALL_NAV = NAV.map(n=>n.key);
var ROLE_NAV = {
  'Recruitment Requester':['dashboard','requests','applicants','settings'],
  'Department Manager':['dashboard','requests','applicants','interviews','reports','settings'],
  'HR Officer':['dashboard','requests','applicants','interviews','offers','reports','settings'],
  'HR Manager':ALL_NAV,
  'Interviewer':['dashboard','applicants','interviews','settings'],
  'General Director':['dashboard','requests','offers','reports','settings'],
  'System Manager':ALL_NAV,
};
var PAGE_PARENT = {requestDetail:'requests', requestForm:'requests', applicantDetail:'applicants', feedback:'interviews', offerDetail:'offers'};
var canAccess = page => ROLE_NAV[state.role].includes(PAGE_PARENT[page]||page);

/* =====================================================================
   6. SHARED UI HELPERS (mỗi hàm ~ 1 React component)
   ===================================================================== */
/* Status → tone: một nguồn duy nhất để màu trạng thái thống nhất toàn hệ thống */
var TONE = {
  'Draft':'neutral','Pending Department Approval':'warning','Pending HR Review':'warning','Pending Director Approval':'warning',
  'Revision Required':'primary','Approved':'success','Rejected':'danger','Cancelled':'neutral',
  'Low':'neutral','Normal':'info','High':'warning','Urgent':'danger',
  'New':'info','Screening':'primary','Interview Scheduled':'primary','Interviewing':'warning','Passed':'success','Offer Sent':'info','Hired':'success',
  'Scheduled':'info','In Progress':'warning','Completed':'success','No Show':'danger',
  'Not Started':'neutral','Pending':'warning','Submitted':'success','Not Required':'neutral','Overdue':'danger',
  'Pending Approval':'warning','Sent':'info','Accepted':'success','Declined':'danger','Expired':'danger',
  'Online':'info','Onsite':'neutral','Strong Hire':'success','Hire':'success','Consider':'warning','No Hire':'danger','Strong No Hire':'danger',
};
/* React component: StatusBadge — luôn có chữ + chấm, không dùng màu làm tín hiệu duy nhất */
function badge(text, tone, extraCls=''){ const t = tone || TONE[text] || 'neutral'; return `<span class="badge badge-${t} ${extraCls}"><span class="badge-dot" aria-hidden="true"></span>${esc(labelVi(text))}</span>`; }
function avatar(name, size=''){ return `<span class="avatar ${size} av-${hash(name)%6}" aria-hidden="true">${esc(initials(name))}</span>`; }
function person(name, sub, size='sm'){ return `<div class="person">${avatar(name,size)}<div class="person-text"><strong>${esc(name)}</strong>${sub?`<span>${esc(labelVi(sub))}</span>`:''}</div></div>`; }
function avatarStack(names){ return `<span class="avatar-stack" title="${esc(names.join(', '))}">${names.map(n=>avatar(n,'sm')).join('')}</span><span class="sr-only">${esc(names.join(', '))}</span>`; }
function masked(label='Đã ẩn'){ return `<span class="masked" data-tip="Bạn không có quyền xem thông tin này">${icon('lock')}${esc(labelVi(label))}</span>`; }
function money(n){ return PERM.seeSalary() ? fmtMoney(n) : masked(); }
function salaryRange(r){ return PERM.seeSalary() ? `${fmtM(r.salaryMin)} – ${fmtM(r.salaryMax)} ₫` : masked(); }
function method(m){ return `<span class="row" style="gap:6px">${icon(m==='Online'?'video':'pin')}${esc(labelVi(m))}</span>`; }
function pageHeader(title, desc, actions=''){ return `<div class="page-header"><div><h1 class="page-title">${labelVi(title)}</h1>${desc?`<p class="page-desc">${labelVi(desc)}</p>`:''}</div>${actions?`<div class="page-actions">${actions}</div>`:''}</div>`; }
function btn(label, {variant='secondary', ic, action, data={}, size='', disabled=false, tip='', id='', type='button', ariaLabel=''}={}){
  const attrs = Object.entries(data).map(([k,v])=>`data-${k}="${esc(v)}"`).join(' ');
  const b = `<button type="${type}" class="btn btn-${variant} ${size}" ${action?`data-action="${action}"`:''} ${attrs} ${id?`id="${id}"`:''} ${disabled?'disabled aria-disabled="true"':''} ${ariaLabel?`aria-label="${esc(labelVi(ariaLabel))}"`:''}>${ic?icon(ic):''}${labelVi(label)}</button>`;
  return tip ? `<span data-tip="${esc(labelVi(tip))}" tabindex="${disabled?0:-1}" style="display:inline-flex">${b}</span>` : b;
}
/* React component: Alert */
function alertBox(tone, title, text, extra=''){ const ic = {info:'info',success:'checkCircle',warning:'alert',danger:'alertCircle',neutral:'info'}[tone]; return `<div class="alert alert-${tone}" role="${tone==='danger'?'alert':'status'}">${icon(ic)}<div class="alert-body"><div class="alert-title">${labelVi(title)}</div>${text?`<p>${labelVi(text)}</p>`:''}${extra}</div></div>`; }
/* React component: EmptyState / ErrorState */
function emptyState({ic='inbox', title, text, actions='', variant=''}){ return `<div class="empty ${variant}"><div class="empty-icon">${icon(ic)}</div><h3>${labelVi(title)}</h3>${text?`<p>${labelVi(text)}</p>`:''}${actions?`<div class="btn-group">${actions}</div>`:''}</div>`; }
function permissionDenied(){ return emptyState({ic:'lock', variant:'locked', title:'Bạn không có quyền truy cập', text:`Vai trò ${labelVi(state.role)} hiện tại không được phép truy cập trang này. Hãy liên hệ Quản trị hệ thống nếu bạn cho rằng đây là nhầm lẫn.`, actions:btn('Go to Dashboard',{variant:'primary',action:'go',data:{page:'dashboard'}})}); }
/* React component: LoadingSkeleton */
function skeletonTable(cols=8, rows=6){
  const w = [60,140,110,90,50,70,120,80,80,40];
  return `<div class="table-wrap" aria-busy="true" aria-label="Đang tải"><table class="table"><thead><tr>${Array.from({length:cols},(_,i)=>`<th><span class="skeleton" style="width:${40+i*7%50}px;height:10px"></span></th>`).join('')}</tr></thead><tbody>${Array.from({length:rows},()=>`<tr>${Array.from({length:cols},(_,i)=>`<td><span class="skeleton" style="width:${w[i%w.length]}px"></span></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function skeletonBlock(){ return `<div class="card card-body" aria-busy="true"><span class="skeleton lg" style="width:40%"></span><div class="mt-4 stack-sm">${'<span class="skeleton" style="width:100%"></span>'.repeat(4)}<span class="skeleton" style="width:65%"></span></div></div>`; }
/* React component: Tabs */
function tabs(ns, items, active){ return `<div class="tabs" role="tablist" aria-label="Các mục">${items.map(t=>`<button class="tab ${t.key===active?'active':''}" role="tab" id="tab-${ns}-${t.key}" aria-selected="${t.key===active}" aria-controls="panel-${ns}" tabindex="${t.key===active?0:-1}" data-action="setTab" data-ns="${ns}" data-tab="${t.key}">${t.icon?icon(t.icon):''}${esc(labelVi(t.label))}${t.count!=null?`<span class="pill-count">${t.count}</span>`:''}</button>`).join('')}</div>`; }
function progress(pct, tone=''){ return `<div class="progress ${tone}" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${Math.min(100,pct)}%"></span></div>`; }
/* React component: Pagination */
function pager(ns, total){
  const s = state[ns]; const pages = Math.max(1, Math.ceil(total/s.size)); if(s.page>pages) s.page=pages;
  const from = total ? (s.page-1)*s.size+1 : 0, to = Math.min(total, s.page*s.size);
  let nums = '';
  for(let p=1;p<=pages;p++) nums += `<button class="page-btn ${p===s.page?'active':''}" data-action="page" data-ns="${ns}" data-page="${p}" aria-label="Trang ${p}" ${p===s.page?'aria-current="page"':''}>${p}</button>`;
  return `<div class="pagination">
    <div class="page-size"><label for="ps-${ns}">Số dòng mỗi trang</label><select class="select" id="ps-${ns}" data-change="pageSize" data-ns="${ns}">${[5,10,20,50].map(n=>`<option ${n===s.size?'selected':''}>${n}</option>`).join('')}</select></div>
    <div>Đang hiển thị <strong>${from}–${to}</strong> trên tổng số <strong>${total}</strong></div>
    <div class="page-btns"><button class="page-btn" data-action="page" data-ns="${ns}" data-page="${s.page-1}" ${s.page<=1?'disabled':''} aria-label="Trang trước">${icon('chevLeft')}</button>${nums}<button class="page-btn" data-action="page" data-ns="${ns}" data-page="${s.page+1}" ${s.page>=pages?'disabled':''} aria-label="Trang sau">${icon('chevRight')}</button></div>
  </div>`;
}
var paginate = (list, ns) => { const s=state[ns]; const pages=Math.max(1,Math.ceil(list.length/s.size)); if(s.page>pages) s.page=pages; return list.slice((s.page-1)*s.size, s.page*s.size); };
/* Form field wrapper — label + control + help/error */
function field({id, label, required=false, error='', help='', control, span=false, cls=''}){
  return `<div class="field ${error?'has-error':''} ${span?'col-span-2':''} ${cls}" data-field="${id}" ${help?`data-help="${esc(help)}"`:''}>
    <label class="label" for="${id}">${esc(labelVi(label))}${required?'<span class="req" aria-hidden="true">*</span><span class="sr-only">(bắt buộc)</span>':''}</label>
    ${control}
    <div class="field-msg">${error?`<span class="error-msg" id="${id}-err">${icon('alertCircle')}${esc(error)}</span>`:(help?`<span class="help">${esc(help)}</span>`:'')}</div>
  </div>`;
}
var errAttrs = (id, error) => error ? `aria-invalid="true" aria-describedby="${id}-err"` : '';
function input(id, {type='text', value='', placeholder='', error='', disabled=false, attrs='', cls=''}={}){ return `<input class="input ${error?'is-error':''} ${cls}" id="${id}" name="${id}" type="${type}" value="${esc(value)}" placeholder="${esc(labelVi(placeholder))}" ${disabled?'disabled':''} ${errAttrs(id,error)} ${attrs}>`; }
function select(id, options, {value='', placeholder='', error='', disabled=false, attrs='', cls=''}={}){
  return `<select class="select ${error?'is-error':''} ${cls}" id="${id}" name="${id}" ${disabled?'disabled':''} ${errAttrs(id,error)} ${attrs}>${placeholder!==null&&placeholder!==undefined&&placeholder!==''?`<option value="">${esc(labelVi(placeholder))}</option>`:''}${options.map(o=>{const v=typeof o==='object'?o.value:o, l=typeof o==='object'?o.label:o; return `<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(labelVi(l))}</option>`;}).join('')}</select>`;
}
function textarea(id, {value='', placeholder='', error='', disabled=false, attrs='', rows=4}={}){ return `<textarea class="textarea ${error?'is-error':''}" id="${id}" name="${id}" rows="${rows}" placeholder="${esc(labelVi(placeholder))}" ${disabled?'disabled':''} ${errAttrs(id,error)} ${attrs}>${esc(value)}</textarea>`; }
function setFieldError(root, id, msg){
  const f = root.querySelector(`[data-field="${id}"]`); if(!f) return;
  const ctl = f.querySelector('.input,.select,.textarea');
  f.classList.toggle('has-error', !!msg);
  if(ctl){ ctl.classList.toggle('is-error', !!msg); if(msg){ ctl.setAttribute('aria-invalid','true'); ctl.setAttribute('aria-describedby', id+'-err'); } else { ctl.removeAttribute('aria-invalid'); ctl.removeAttribute('aria-describedby'); } }
  const m = f.querySelector('.field-msg');
  if(m) m.innerHTML = msg ? `<span class="error-msg" id="${id}-err">${icon('alertCircle')}${esc(msg)}</span>` : (f.dataset.help?`<span class="help">${esc(f.dataset.help)}</span>`:'');
}
async function withLoading(button, fn, ms=700){
  if(button){ button.classList.add('is-loading'); button.setAttribute('aria-busy','true'); button.disabled = true; }
  await sleep(ms);
  try{ await fn(); } finally { if(button && document.body.contains(button)){ button.classList.remove('is-loading'); button.removeAttribute('aria-busy'); button.disabled=false; } }
}
function downloadCSV(filename, cols, rows){
  const escCell = v => { const s=String(v??''); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; };
  const csv = '﻿' + [cols, ...rows].map(r=>r.map(escCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a = document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
  toast('success','Export completed',`${filename} · ${rows.length} rows`);
}

/* =====================================================================
   7. OVERLAYS — Toast, Dropdown, Modal, Confirm, Drawer
   ===================================================================== */
/* React component: Toast */
function toast(type, title, msg=''){
  const ic = {success:'checkCircle',error:'xCircle',warning:'alert',info:'info'}[type]||'info';
  const el = document.createElement('div');
  el.className = `toast ${type}`; el.setAttribute('role', type==='error'?'alert':'status');
  el.innerHTML = `<span class="toast-icon">${icon(ic)}</span><div class="grow"><div class="toast-title">${esc(labelVi(title))}</div>${msg?`<div class="toast-msg">${esc(labelVi(msg))}</div>`:''}</div><button class="icon-btn sm" aria-label="Đóng thông báo">${icon('x')}</button>`;
  const remove = () => { el.classList.add('leaving'); setTimeout(()=>el.remove(), 200); };
  el.querySelector('button').onclick = remove;
  $('#toast-root').appendChild(el);
  setTimeout(remove, 4200);
}

/* React component: Dropdown (floating menu) */
var menuTrigger = null;
function openMenu(trigger, items, {align='right', width}={}){
  const m = $('#floating-menu');
  if(menuTrigger===trigger && !m.hidden){ closeMenu(); return; }
  closeMenu(); menuTrigger = trigger;
  m.innerHTML = items.map(it=>{
    if(it.divider) return '<div class="menu-divider" role="separator"></div>';
    if(it.header) return `<div class="menu-header">${esc(labelVi(it.header))}</div>`;
    if(it.html) return it.html;
    const attrs = Object.entries(it.data||{}).map(([k,v])=>`data-${k}="${esc(v)}"`).join(' ');
    return `<button class="menu-item ${it.danger?'danger':''}" role="menuitem" data-action="${it.action}" ${attrs} ${it.disabled?'disabled':''} ${it.tip?`title="${esc(labelVi(it.tip))}"`:''}>${it.icon?icon(it.icon):''}<span>${esc(labelVi(it.label))}</span>${it.checked?`<span class="check-mark">${icon('check')}</span>`:''}${it.hint?`<span class="menu-hint">${esc(labelVi(it.hint))}</span>`:''}</button>`;
  }).join('');
  if(width) m.style.width = width+'px'; else m.style.width='';
  m.hidden = false;
  trigger.setAttribute('aria-expanded','true');
  const r = trigger.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
  let left = align==='right' ? r.right - mw : r.left;
  left = Math.max(8, Math.min(left, window.innerWidth - mw - 8));
  let top = r.bottom + 6; if(top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
  m.style.left = left+'px'; m.style.top = top+'px';
  const first = m.querySelector('.menu-item:not(:disabled)'); if(first) first.focus();
}
function closeMenu(){ const m=$('#floating-menu'); if(m.hidden) return; m.hidden=true; if(menuTrigger){ menuTrigger.setAttribute('aria-expanded','false'); } menuTrigger=null; }

/* React component: Modal */
var modalStack = [];
function openModal({title, desc='', body, footer='', size='', onClose, dismissible=true, labelId='modal-title-'+Date.now()}){
  const prevFocus = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'overlay';
  wrap.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="${labelId}">
    <div class="modal-header"><div><h2 class="modal-title" id="${labelId}">${labelVi(title)}</h2>${desc?`<p class="modal-desc">${labelVi(desc)}</p>`:''}</div><button class="icon-btn sm" data-modal-close aria-label="Đóng hộp thoại">${icon('x')}</button></div>
    <div class="modal-body">${body}</div>
    ${footer?`<div class="modal-footer">${footer}</div>`:''}
  </div>`;
  const entry = {el:wrap, prevFocus, onClose, dismissible};
  modalStack.push(entry);
  wrap.addEventListener('mousedown', e=>{ if(e.target===wrap && dismissible) closeModal(); });
  wrap.querySelector('[data-modal-close]').onclick = ()=>closeModal();
  $('#modal-root').appendChild(wrap);
  setTimeout(()=>{ const f = wrap.querySelector('.modal-body input:not([type=hidden]):not(:disabled),.modal-body select,.modal-body textarea') || wrap.querySelector('.modal-footer .btn-primary,.modal-footer .btn-danger') || wrap.querySelector('[data-modal-close]'); f && f.focus(); }, 30);
  return wrap;
}
function closeModal(result){
  const entry = modalStack.pop(); if(!entry) return;
  entry.el.remove();
  entry.onClose && entry.onClose(result);
  if(entry.prevFocus && document.body.contains(entry.prevFocus)) entry.prevFocus.focus();
}

/* React component: ConfirmDialog — trả về Promise<boolean> */
function confirmDialog({title, message, confirmText='Xác nhận', cancelText='Hủy', tone='primary', ic}){
  return new Promise(resolve=>{
    let done = false;
    const toneMap = {primary:['tone-primary','info','btn-primary'], danger:['tone-danger','alert','btn-danger'], success:['tone-success','checkCircle','btn-primary'], warning:['tone-warning','alert','btn-primary']}[tone];
    const el = openModal({size:'sm', title, labelId:'confirm-title',
      body:`<div class="confirm-body"><span class="confirm-icon ${toneMap[0]}">${icon(ic||toneMap[1])}</span><p class="muted" style="margin-top:4px">${labelVi(message)}</p></div>`,
      footer:`<button class="btn btn-secondary" data-confirm="0">${esc(labelVi(cancelText))}</button><button class="btn ${toneMap[2]}" data-confirm="1">${esc(labelVi(confirmText))}</button>`,
      onClose:()=>{ if(!done){ done=true; resolve(false); } }});
    el.querySelectorAll('[data-confirm]').forEach(b=>b.onclick=()=>{ done=true; const ok=b.dataset.confirm==='1'; closeModal(); resolve(ok); });
  });
}

/* React component: ReasonModal — bắt buộc nhập lý do (Reject / Request Revision / Declined) */
function reasonModal({title, desc, label='Lý do', confirmText='Xác nhận', tone='danger', placeholder='Nhập lý do chi tiết…', minLen=10}){
  return new Promise(resolve=>{
    let done=false;
    const el = openModal({title, desc, labelId:'reason-title',
      body:`${field({id:'reason-text', label, required:true, help:`Tối thiểu ${minLen} ký tự. Lý do sẽ được ghi vào lịch sử thao tác.`, control:textarea('reason-text',{placeholder, rows:5})})}`,
      footer:`<button class="btn btn-secondary" data-r="cancel">Hủy</button><button class="btn ${tone==='danger'?'btn-danger':'btn-primary'}" data-r="ok">${esc(labelVi(confirmText))}</button>`,
      onClose:()=>{ if(!done){ done=true; resolve(null); } }});
    const ta = el.querySelector('#reason-text');
    ta.addEventListener('input', ()=>{ if(ta.value.trim().length>=minLen) setFieldError(el,'reason-text',null); });
    el.querySelector('[data-r=cancel]').onclick = ()=>closeModal();
    el.querySelector('[data-r=ok]').onclick = async (e)=>{
      const v = ta.value.trim();
      if(!v){ setFieldError(el,'reason-text','Vui lòng nhập lý do.'); ta.focus(); return; }
      if(v.length<minLen){ setFieldError(el,'reason-text',`Lý do phải có ít nhất ${minLen} ký tự (hiện có ${v.length}).`); ta.focus(); return; }
      await withLoading(e.currentTarget, ()=>{}, 500);
      done=true; closeModal(); resolve(v);
    };
  });
}

/* React component: Drawer */
var drawerPrevFocus = null;
function openDrawer({title, sub='', body, footer=''}){
  closeDrawer(true);
  drawerPrevFocus = document.activeElement;
  $('#drawer-root').innerHTML = `<div class="drawer-overlay" data-action="closeDrawer"></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div class="drawer-header"><div><h2 class="modal-title" id="drawer-title">${labelVi(title)}</h2>${sub?`<p class="modal-desc">${labelVi(sub)}</p>`:''}</div><button class="icon-btn sm" data-action="closeDrawer" aria-label="Đóng bảng thông tin">${icon('x')}</button></div>
      <div class="drawer-body">${body}</div>
      ${footer?`<div class="drawer-footer">${footer}</div>`:''}
    </aside>`;
  setTimeout(()=>{ const b=$('#drawer-root [data-action=closeDrawer].icon-btn'); b && b.focus(); },30);
}
function closeDrawer(silent){ const had = $('#drawer-root').innerHTML; $('#drawer-root').innerHTML=''; if(had && !silent && drawerPrevFocus && document.body.contains(drawerPrevFocus)) drawerPrevFocus.focus(); }

/* =====================================================================
   8. LAYOUT — Sidebar, Header, Breadcrumb
   ===================================================================== */
function renderSidebar(){
  const allowed = ROLE_NAV[state.role];
  const active = PAGE_PARENT[state.page] || state.page;
  const counts = {requests: REQUESTS.filter(r=>r.state.startsWith('Pending')).length, interviews: 7};
  $('#sidebar-nav').innerHTML = `<div class="nav-section">Tuyển dụng</div>` + NAV.filter(n=>allowed.includes(n.key)).map(n=>
    `${n.section?`<div class="nav-section">${n.section}</div>`:''}<button class="nav-item ${active===n.key?'active':''}" data-action="go" data-page="${n.key}" data-label="${esc(n.label)}" ${active===n.key?'aria-current="page"':''}>${icon(n.icon)}<span class="nav-label">${esc(n.label)}</span>${counts[n.key]?`<span class="nav-count" aria-label="${counts[n.key]} pending">${counts[n.key]}</span>`:''}</button>`
  ).join('');
}
function renderHeader(){
  const u = currentUser();
  $('#sidebar-toggle').innerHTML = icon(isMobile()?'menu':'sidebar');
  $('#sidebar-toggle').setAttribute('aria-label', isMobile()?'Mở menu điều hướng':(state.collapsed?'Mở rộng thanh bên':'Thu gọn thanh bên'));
  $('#sidebar-toggle').setAttribute('aria-expanded', isMobile()? String($('#app').classList.contains('mobile-nav-open')) : String(!state.collapsed));
  $('#search-icon-slot').innerHTML = icon('search');
  $('#mobile-search-btn').innerHTML = icon('search');
  const unread = NOTIFICATIONS.filter(n=>n.unread).length;
  $('#notif-btn').innerHTML = icon('bell') + (unread?`<span class="notif-dot">${unread}</span>`:'');
  $('#notif-btn').setAttribute('aria-label', `Thông báo (${unread} chưa đọc)`);
  $('#theme-btn').innerHTML = icon(state.theme==='dark'?'sun':'moon');
  $('#theme-btn').setAttribute('aria-label', state.theme==='dark'?'Chuyển sang giao diện sáng':'Chuyển sang giao diện tối');
  $('#theme-btn').setAttribute('data-tip', state.theme==='dark'?'Giao diện sáng':'Giao diện tối'); $('#theme-btn').setAttribute('data-tip-pos','bottom');
  $('#user-btn').innerHTML = `${avatar(u.user)}<span class="user-meta"><strong>${esc(u.user)}</strong><span>${esc(labelVi(state.role))}</span></span>${icon('chevDown')}`;
  $('#user-btn').setAttribute('aria-label', `Tài khoản: ${u.user}, vai trò ${labelVi(state.role)}`);
  // Breadcrumb
  const crumbs = BREADCRUMBS[state.page] ? BREADCRUMBS[state.page]() : [{label:'Dashboard'}];
  const all = [{label:'Trang chủ',page:'dashboard'}, ...crumbs];
  $('#breadcrumb').innerHTML = `<ol>${all.map((c,i)=>{
    const last = i===all.length-1;
    return `<li>${i>0?`<span class="sep" aria-hidden="true">${icon('chevRight')}</span>`:''}${last?`<span class="current" aria-current="page">${esc(labelVi(c.label))}</span>`:`<button data-action="go" data-page="${c.page}" ${c.params?`data-params='${esc(JSON.stringify(c.params))}'`:''}>${esc(labelVi(c.label))}</button>`}</li>`;
  }).join('')}</ol>`;
}
var BREADCRUMBS = {
  dashboard:()=>[{label:'Dashboard'}],
  requests:()=>[{label:'Recruitment Requests'}],
  requestDetail:()=>[{label:'Recruitment Requests',page:'requests'},{label:state.params.code}],
  requestForm:()=>[{label:'Recruitment Requests',page:'requests'},{label:state.form&&state.form.code?`Edit ${state.form.code}`:'New Request'}],
  applicants:()=>[{label:'Applicants'}],
  applicantDetail:()=>[{label:'Applicants',page:'applicants'},{label:(findApp(state.params.code)||{}).name||state.params.code}],
  interviews:()=>[{label:'Interviews'}],
  feedback:()=>[{label:'Interviews',page:'interviews'},{label:`Feedback ${state.params.code}`}],
  offers:()=>[{label:'Job Offers'}],
  offerDetail:()=>[{label:'Job Offers',page:'offers'},{label:state.params.code}],
  reports:()=>[{label:'Reports'}],
  settings:()=>[{label:'Settings'}],
};
function applyLayout(){
  const app = $('#app');
  if(isMobile()){ app.classList.remove('sidebar-collapsed'); }
  else { app.classList.remove('mobile-nav-open'); app.classList.toggle('sidebar-collapsed', state.collapsed); }
}
function openMobileNav(){ $('#app').classList.add('mobile-nav-open'); renderHeader(); setTimeout(()=>{ const a=$('#sidebar-nav .nav-item.active')||$('#sidebar-nav .nav-item'); a&&a.focus(); },50); }
function closeMobileNav(){ if(!$('#app').classList.contains('mobile-nav-open')) return; $('#app').classList.remove('mobile-nav-open'); renderHeader(); }

/* =====================================================================
   9. PAGES
   Mỗi PAGES.xxx trả về HTML string cho <main>. Trong React, mỗi page là
   một route component (react-router), dữ liệu lấy từ Frappe API.
   ===================================================================== */

var PAGES = {};
var AFTER = {};
