"use strict";

/* =====================================================================
   13. GLOBAL EVENT LISTENERS
   ===================================================================== */
document.addEventListener('click', e=>{
  const el = e.target.closest('[data-action]');
  const menu = $('#floating-menu');
  if(!menu.hidden && !e.target.closest('#floating-menu') && (!el || el!==menuTrigger)) closeMenu();
  if(!e.target.closest('#header-search') && !e.target.closest('#mobile-search-btn')){ const r=$('#search-results'); if(r) r.hidden=true; }
  if(!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.action]; if(!fn) return;
  if(el.tagName==='A') e.preventDefault();
  if(el.closest('.search-results')) { $('#global-search').value=''; hideSearch(); }
  if(el.closest('#floating-menu') && el.dataset.action!=='markAllRead') closeMenu();
  fn(el, e);
});
document.addEventListener('change', e=>{ const el=e.target.closest('[data-change]'); if(el && CHANGES[el.dataset.change]) CHANGES[el.dataset.change](el, e); });
document.addEventListener('input', e=>{ const el=e.target.closest('[data-input]'); if(el && INPUTS[el.dataset.input]) INPUTS[el.dataset.input](el, e); });
document.addEventListener('keydown', e=>{
  // Escape: đóng lớp trên cùng
  if(e.key==='Escape'){
    if(!$('#floating-menu').hidden){ const t=menuTrigger; closeMenu(); t&&t.focus(); return; }
    if(modalStack.length){ if(modalStack[modalStack.length-1].dismissible) closeModal(); return; }
    if($('#drawer-root').innerHTML){ closeDrawer(); return; }
    if(!$('#search-results').hidden || $('#header').classList.contains('search-open')){ hideSearch(); $('#global-search').blur(); return; }
    if($('#app').classList.contains('mobile-nav-open')){ closeMobileNav(); $('#sidebar-toggle').focus(); return; }
  }
  // Enter / Space trên các phần tử role=button, tr clickable
  if((e.key==='Enter' || e.key===' ') && e.target.matches('tr[data-action],[role=button][data-action],.k-card')){ e.preventDefault(); e.target.click(); return; }
  // Enter trên input có data-enter
  if(e.key==='Enter' && e.target.dataset && e.target.dataset.enter){ e.preventDefault(); ACTIONS[e.target.dataset.enter](e.target); return; }
  // Arrow keys trong tablist & menu
  if(['ArrowRight','ArrowLeft'].includes(e.key) && e.target.matches('.tab')){ const tabsEls=$$('.tab', e.target.parentElement); const i=tabsEls.indexOf(e.target); const n=tabsEls[(i+(e.key==='ArrowRight'?1:-1)+tabsEls.length)%tabsEls.length]; n.focus(); n.click(); e.preventDefault(); return; }
  if(['ArrowDown','ArrowUp'].includes(e.key) && e.target.closest('#floating-menu')){ const items=$$('#floating-menu .menu-item:not(:disabled), #floating-menu .notif-item'); const i=items.indexOf(document.activeElement); const n=items[(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]; n&&n.focus(); e.preventDefault(); return; }
  // Focus trap trong modal / drawer
  if(e.key==='Tab'){
    const scope = modalStack.length ? modalStack[modalStack.length-1].el : ($('#drawer-root .drawer') || null);
    if(scope){ const f=$$('button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])',scope).filter(x=>x.offsetParent!==null); if(!f.length) return; const first=f[0], last=f[f.length-1];
      if(e.shiftKey && document.activeElement===first){ last.focus(); e.preventDefault(); } else if(!e.shiftKey && document.activeElement===last){ first.focus(); e.preventDefault(); } }
  }
  // "/" focus search
  if(e.key==='/' && !e.target.matches('input,textarea,select') && !modalStack.length){ e.preventDefault(); if(isMobile()) $('#header').classList.add('search-open'); $('#global-search').focus(); }
});
$('#global-search').addEventListener('input', e=>runSearch(e.target.value));
$('#global-search').addEventListener('focus', e=>{ if(e.target.value) runSearch(e.target.value); });
$('#global-search').addEventListener('keydown', e=>{
  if(e.key==='Enter'){ const v=e.target.value.trim(); if(!v) return; if(canAccess('applicants')){ state.app.filters={search:v,position:'',dept:'',status:'',source:'',hr:''}; state.app.view='table'; state.app.page=1; e.target.value=''; navigate('applicants'); } }
  if(e.key==='ArrowDown'){ const f=$('#search-results .search-item'); if(f){ f.focus(); e.preventDefault(); } }
});
$('#search-results').addEventListener('keydown', e=>{ if(['ArrowDown','ArrowUp'].includes(e.key)){ const items=$$('#search-results .search-item'); const i=items.indexOf(document.activeElement); const n=items[i+(e.key==='ArrowDown'?1:-1)]; (n||$('#global-search')).focus(); e.preventDefault(); } });
window.addEventListener('beforeunload', e=>{ if(state.page==='requestForm' && state.formDirty){ e.preventDefault(); e.returnValue=''; } });
var lastMobile = isMobile();
window.addEventListener('resize', ()=>{ const m=isMobile(); if(m!==lastMobile){ lastMobile=m; applyLayout(); renderHeader(); } closeMenu(); });

/* =====================================================================
   14. INIT
   ===================================================================== */
(function init(){
  let saved=null; try{ saved = localStorage.getItem('rms-theme'); }catch(e){}
  state.theme = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', state.theme);
  if(window.innerWidth < 1024 && window.innerWidth >= 768) state.collapsed = true;
  render();
})();
