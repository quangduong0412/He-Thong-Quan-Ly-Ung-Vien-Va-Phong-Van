"use strict";

/* =====================================================================
   11. ROUTER
   ===================================================================== */
function navigate(page, params={}, opts={}){
  if(!opts.force && state.page==='requestForm' && state.formDirty && page!=='requestForm'){
    confirmDialog({title:'Bỏ các thay đổi chưa lưu?', message:'Bạn có thay đổi chưa lưu trong biểu mẫu. Nếu rời trang, các thay đổi sẽ bị mất.', confirmText:'Bỏ thay đổi và rời trang', cancelText:'Ở lại trang', tone:'danger'})
      .then(ok=>{ if(ok){ state.formDirty=false; navigate(page, params, {force:true}); } });
    return;
  }
  if(!canAccess(page)){ toast('warning','Không có quyền truy cập',`Vai trò ${labelVi(state.role)} không thể mở trang này.`); page='dashboard'; params={}; }
  if(page!==state.page || JSON.stringify(params)!==JSON.stringify(state.params)){
    if(page==='requestDetail') state.tab.request='overview';
    if(page==='applicantDetail') state.tab.applicant='overview';
  }
  if(page==='settings') state.settingsDraft = null;
  state.page = page; state.params = params;
  closeMenu(); closeDrawer(true); closeMobileNav(); hideSearch();
  render();
  window.scrollTo(0,0);
  $('#main').focus({preventScroll:true});
}
function render(){
  applyLayout(); renderSidebar(); renderHeader();
  const fn = PAGES[state.page] || PAGES.dashboard;
  $('#main').innerHTML = fn();
  AFTER[state.page] && AFTER[state.page]();
  document.title = `${(BREADCRUMBS[state.page]?BREADCRUMBS[state.page]().slice(-1)[0].label:'Dashboard')} · RMS Prototype`;
}
function applyPreset(p){
  if(!p) return;
  if(p==='openRequests') state.req.filters = {...state.req.filters, search:'', state:'__open'};
  if(p==='pending') state.req.filters = {...state.req.filters, state:'__pending'};
  if(p==='allApplicants'){ state.app.filters = {search:'',position:'',dept:'',status:'',source:'',hr:''}; state.app.view='table'; }
  if(p==='hired'){ state.app.filters = {search:'',position:'',dept:'',status:'Hired',source:'',hr:''}; state.app.view='table'; }
  if(p.startsWith('stage:')){ state.app.filters = {search:'',position:'',dept:'',status:p.slice(6),source:'',hr:''}; state.app.view='table'; state.app.page=1; }
  if(p==='thisWeek'){ state.int.filters = {date:'',interviewer:'',round:'',status:'',method:'',feedback:''}; state.int.view='calendar'; state.int.weekStart='2026-11-09'; }
  if(p==='calendar'){ state.int.view='calendar'; }
  if(p==='pendingFeedback'){ state.int.filters = {date:'',interviewer:'',round:'',status:'',method:'',feedback:'Pending'}; state.int.view='list'; }
  if(p==='activeOffers') state.off.filters = {search:'',status:'__active'};
}
