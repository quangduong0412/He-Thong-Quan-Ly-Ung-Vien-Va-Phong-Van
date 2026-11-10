"use strict";

/* ------------------------------------------------------------ INTERVIEW LIST */
function filterInterviews(){
  const f = state.int.filters, me = currentUser().user;
  return INTERVIEWS.filter(i=>(!f.date||i.date===f.date) && (!f.interviewer||i.interviewers.includes(f.interviewer)) && (!f.round||i.round===f.round) && (!f.status||i.status===f.status) && (!f.method||i.method===f.method) && (!f.feedback||fbStatus(i)===f.feedback)
    && (state.role!=='Interviewer' || i.interviewers.includes(me)))
    .sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start));
}
PAGES.interviews = () => {
  const f = state.int.filters, s = state.int;
  return `${pageHeader('Interviews',state.role==='Interviewer'?'Lịch phỏng vấn được phân công cho bạn.':'Quản lý lịch phỏng vấn và tình trạng nhận xét.',PERM.scheduleInterview()?btn('Schedule Interview',{variant:'primary',ic:'plus',action:'openSchedule'}):'')}
  <div class="card">
    <div class="filter-panel ${s.showFilters?'show':''}" id="int-filters" role="search" aria-label="Lọc lịch phỏng vấn">
      ${field({id:'if-date',label:'Date',control:input('if-date',{type:'date',value:f.date,attrs:'data-change="intFilter" data-key="date"'})})}
      ${field({id:'if-interviewer',label:'Interviewer',control:select('if-interviewer',INTERVIEWERS,{value:f.interviewer,placeholder:'All interviewers',attrs:'data-change="intFilter" data-key="interviewer"'})})}
      ${field({id:'if-round',label:'Interview Round',control:select('if-round',ROUNDS,{value:f.round,placeholder:'All rounds',attrs:'data-change="intFilter" data-key="round"'})})}
      ${field({id:'if-status',label:'Status',control:select('if-status',INT_STATUSES,{value:f.status,placeholder:'All statuses',attrs:'data-change="intFilter" data-key="status"'})})}
      ${field({id:'if-method',label:'Interview Method',control:select('if-method',['Online','Onsite'],{value:f.method,placeholder:'All methods',attrs:'data-change="intFilter" data-key="method"'})})}
      ${field({id:'if-feedback',label:'Feedback Status',control:select('if-feedback',FB_STATUSES,{value:f.feedback,placeholder:'All',attrs:'data-change="intFilter" data-key="feedback"'})})}
    </div>
    <div class="table-toolbar">
      <div class="row row-wrap"><button class="btn btn-secondary btn-sm filter-toggle" data-action="toggleFilters" data-ns="int" aria-expanded="${s.showFilters}" aria-controls="int-filters">${icon('filter')}Bộ lọc</button><span class="small muted" id="int-count"></span>${Object.values(f).some(Boolean)?btn('Clear filters',{variant:'ghost',size:'btn-sm',ic:'x',action:'resetIntFilter'}):''}</div>
      <div class="segmented" role="group" aria-label="Chế độ xem">
        <button class="${s.view==='list'?'active':''}" data-action="setIntView" data-view="list" aria-pressed="${s.view==='list'}">${icon('list')}Danh sách</button>
        <button class="${s.view==='calendar'?'active':''}" data-action="setIntView" data-view="calendar" aria-pressed="${s.view==='calendar'}">${icon('calendar')}Lịch</button>
      </div>
    </div>
    <div id="int-results">${intResults()}</div>
  </div>`;
};
AFTER.interviews = () => { const el=$('#int-count'); if(el) el.textContent = `${filterInterviews().length} cuộc phỏng vấn`; };
function intResults(){
  const list = filterInterviews();
  if(state.int.view==='calendar') return calendarView(list);
  if(!list.length) return emptyState({ic:'calendar',title:'No interviews found',text:'Không có lịch phỏng vấn phù hợp bộ lọc.',actions:btn('Clear filters',{action:'resetIntFilter',ic:'refresh'})});
  return `<!-- React component: InterviewTable -->
  <div class="table-wrap"><table class="table" style="min-width:1320px">
    <thead><tr><th>Ứng viên</th><th>Vị trí</th><th>Vòng phỏng vấn</th><th>Giờ bắt đầu</th><th>Giờ kết thúc</th><th>Người phỏng vấn</th><th>Hình thức</th><th>Địa điểm / liên kết họp</th><th>Trạng thái</th><th>Nhận xét</th><th class="actions-col"><span class="sr-only">Thao tác</span></th></tr></thead>
    <tbody>${list.map(i=>{ const a=findApp(i.app); return `<tr class="clickable" tabindex="0" data-action="interviewDrawer" data-code="${i.code}">
      <td>${person(a.name,i.code)}</td><td>${esc(labelVi(a.position))}</td><td>${esc(labelVi(i.round))}</td>
      <td><div class="small strong">${fmtDate(i.date)}</div><div class="cell-sub">${i.start}</div></td><td>${i.end}</td>
      <td>${avatarStack(i.interviewers)}</td><td>${method(i.method)}</td>
      <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis">${i.method==='Online'?`<a href="#" data-action="mockJoin" class="small">${esc(i.url.replace('https://',''))}</a>`:`<span class="small">${esc(i.location)}</span>`}</td>
      <td>${badge(i.status)}</td><td>${badge(fbStatus(i))}</td>
      <td class="actions-col"><button class="icon-btn sm" data-action="intMenu" data-code="${i.code}" aria-label="Thao tác cho ${i.code}" aria-haspopup="menu">${icon('more')}</button></td>
    </tr>`;}).join('')}</tbody>
  </table></div>`;
}
function calendarView(list){
  const ws = state.int.weekStart, days = Array.from({length:7},(_,k)=>addDays(ws,k));
  const H0 = 8, H1 = 18, PX = 56;
  const stCls = s => ({'Completed':'st-completed','Cancelled':'st-cancelled','No Show':'st-noshow','In Progress':'st-inprogress'}[s]||'');
  return `<!-- React component: InterviewCalendar (week view, không dùng thư viện) -->
  <div class="cal-toolbar">
    <div class="row">${btn('',{variant:'secondary',size:'btn-sm',ic:'chevLeft',action:'calWeek',data:{dir:-1},ariaLabel:'Previous week'})}${btn('Today',{size:'btn-sm',action:'calWeek',data:{dir:0}})}${btn('',{variant:'secondary',size:'btn-sm',ic:'chevRight',action:'calWeek',data:{dir:1},ariaLabel:'Next week'})}</div>
    <strong>${fmtDate(days[0])} – ${fmtDate(days[6])}</strong>
    <div class="chart-legend"><span>${badge('Scheduled')}</span><span>${badge('In Progress')}</span><span>${badge('Completed')}</span><span>${badge('No Show')}</span></div>
  </div>
  <div class="cal-scroll"><div class="cal-grid" role="grid" aria-label="Lịch phỏng vấn theo tuần">
    <div class="cal-corner"></div>
    ${days.map(d=>{const x=new Date(d+'T00:00:00'); return `<div class="cal-head ${d===TODAY?'today':''}" role="columnheader"><div class="dow">${DOW_EN[x.getDay()]}</div><div class="dnum">${x.getDate()}</div></div>`;}).join('')}
    <div class="cal-times">${Array.from({length:H1-H0},(_,k)=>`<div class="cal-time">${String(H0+k).padStart(2,'0')}:00</div>`).join('')}</div>
    ${days.map(d=>`<div class="cal-day ${d===TODAY?'today':''}" role="gridcell" aria-label="${fmtDateLong(d)}">
      ${d===TODAY?`<div class="now-line" style="top:${(NOW_HOUR-H0)*PX}px" aria-hidden="true"></div>`:''}
      ${list.filter(i=>i.date===d).map(i=>{ const a=findApp(i.app); const top=(toMin(i.start)/60-H0)*PX, h=Math.max(26,(toMin(i.end)-toMin(i.start))/60*PX-2);
        return `<button class="cal-event ${stCls(i.status)}" style="top:${top}px;height:${h}px" data-action="interviewDrawer" data-code="${i.code}" aria-label="${esc(a.name)}, ${esc(labelVi(i.round))}, ${i.start} đến ${i.end}, ${labelVi(i.status)}"><strong>${i.start} ${esc(a.name)}</strong><span class="ev-sub">${esc(labelVi(i.round))} · ${labelVi(i.method)}</span></button>`;}).join('')}
    </div>`).join('')}
  </div></div>`;
}
function interviewDrawer(code){
  const i = findInt(code), a = findApp(i.app);
  const canFb = i.interviewers.includes(currentUser().user) || PERM.seeFeedback();
  openDrawer({title:`${esc(i.round)}`, sub:`${i.code} · ${fmtDateLong(i.date)}`,
    body:`<div class="stack">
      <div class="row between">${person(a.name,`${labelVi(a.position)} · ${a.code}`,'')}${badge(i.status)}</div>
      <dl class="dl" style="grid-template-columns:1fr 1fr">
        <div><dt>Ngày</dt><dd>${fmtDate(i.date)}</dd></div><div><dt>Thời gian</dt><dd>${i.start} – ${i.end}</dd></div>
        <div><dt>Hình thức</dt><dd>${method(i.method)}</dd></div><div><dt>Nhận xét</dt><dd>${badge(fbStatus(i))}</dd></div>
        <div class="full"><dt>${i.method==='Online'?'Liên kết cuộc họp':'Địa điểm'}</dt><dd>${i.method==='Online'?`<a href="#" data-action="mockJoin">${esc(i.url)}</a>`:esc(i.location)}</dd></div>
      </dl>
      <div><div class="label mb-3">Người phỏng vấn</div><div class="stack-sm">${i.interviewers.map(n=>`<div class="row between">${person(n,n===i.lead?'Người phỏng vấn chính':'Người phỏng vấn')}${i.feedback[n]&&i.feedback[n].status==='Submitted'?badge('Submitted'):(fbStatus(i)==='Pending'?badge('Pending'):'')}</div>`).join('')}</div></div>
      ${i.note?`<div><div class="label">Ghi chú</div><p class="small muted">${esc(i.note)}</p></div>`:''}
    </div>`,
    footer:`${btn('Xem hồ sơ ứng viên',{action:'openApplicant',data:{code:a.code}})}${['Completed','In Progress'].includes(i.status)&&canFb?btn('Xem nhận xét',{variant:'primary',ic:'message',action:'openFeedback',data:{code:i.code}}):''}${i.status==='Scheduled'&&i.method==='Online'?btn('Tham gia cuộc họp',{variant:'primary',ic:'video',action:'mockJoin'}):''}`});
}

/* ------------------------------------------------------- INTERVIEW FEEDBACK */
function fbDraft(i){
  const me = currentUser().user;
  if(!state.fb[i.code]){
    const crit = criteriaForInterview(i);
    const existing = i.feedback[me];
    state.fb[i.code] = existing ? clone(existing) : {scores:crit.map(()=>''), comments:crit.map(()=>''), rec:'', overall:'', status:'Draft'};
  }
  return state.fb[i.code];
}
PAGES.feedback = () => {
  const i = findInt(state.params.code); if(!i) return emptyState({ic:'alertCircle',variant:'error',title:'Interview not found'});
  const a = findApp(i.app), crit = criteriaForInterview(i), me = currentUser().user;
  const assigned = i.interviewers.includes(me);
  const canEdit = (state.role==='Interviewer' && assigned) || state.role==='System Manager';
  let d;
  if(canEdit) d = fbDraft(i);
  else { const firstSubmitted = i.interviewers.find(n=>i.feedback[n]&&i.feedback[n].status==='Submitted'); d = firstSubmitted ? i.feedback[firstSubmitted] : null; }
  const viewingAs = canEdit ? me : (d ? i.interviewers.find(n=>i.feedback[n]===d) : null);
  const readOnly = !canEdit || (d && d.status==='Submitted');
  if(!canEdit && !PERM.seeFeedback()) return permissionDenied();
  const passing = 70;
  return `${pageHeader('Nhận xét phỏng vấn',`${i.code} · Phiếu đánh giá ứng viên`, btn('Back',{variant:'ghost',ic:'arrowLeft',action:'go',data:{page:'interviews'}}))}
  ${!canEdit?`<div class="mb-4">${alertBox('info','Chế độ chỉ xem',`Chỉ người phỏng vấn được phân công mới có thể nhập nhận xét. ${d?`Đang hiển thị nhận xét của <strong>${esc(viewingAs)}</strong>.`:'Chưa có nhận xét nào được gửi.'}`)}</div>`:''}
  ${canEdit && d.status==='Submitted'?`<div class="mb-4">${alertBox('success','Đã gửi nhận xét',`Bạn đã gửi lúc ${esc(d.submittedAt)}. Phiếu chuyển sang chế độ chỉ xem.`)}</div>`:''}
  <!-- React component: InterviewForm (Feedback) -->
  <section class="card"><div class="card-body">
    <div class="row between row-wrap" style="gap:16px">${person(a.name,`${a.position} · ${a.dept}`,'lg')}${badge(i.status)}</div>
    <dl class="dl cols-3 mt-4" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      <div><dt>Vị trí</dt><dd>${esc(labelVi(a.position))}</dd></div><div><dt>Vòng phỏng vấn</dt><dd>${esc(labelVi(i.round))}</dd></div>
      <div><dt>Thời gian phỏng vấn</dt><dd>${fmtDate(i.date)} · ${i.start}–${i.end}</dd></div><div><dt>Người phỏng vấn</dt><dd>${esc(viewingAs||me)}</dd></div>
      <div><dt>Điểm đạt yêu cầu</dt><dd>${passing} / 100</dd></div>
    </dl>
  </div></section>
  ${!d? `<section class="card mt-5">${emptyState({ic:'message',title:'Chưa có nhận xét nào được gửi'})}</section>` : `
  <section class="card mt-5"><div class="card-header"><div><h2 class="card-title">Tiêu chí đánh giá</h2><div class="card-sub">Điểm tối đa bằng trọng số tiêu chí trong yêu cầu tuyển dụng. Tiêu chí bắt buộc cần đạt ≥ 50%.</div></div></div>
    <div class="table-wrap"><table class="table" style="min-width:820px">
      <thead><tr><th>Tiêu chí</th><th class="num">Điểm tối đa</th><th style="width:150px">Điểm</th><th>Nhận xét</th></tr></thead>
      <tbody>${crit.map((c,k)=>`<tr>
        <td><div class="cell-main">${esc(labelVi(c.name))} ${c.mandatory?badge('Mandatory','primary'):''}</div><div class="cell-sub">${esc(labelVi(c.desc))}</div></td>
        <td class="num strong">${c.weight}</td>
        <td><div class="field" data-field="score-${k}"><input class="input sm" type="number" min="0" max="${c.weight}" step="1" id="score-${k}" value="${esc(d.scores[k])}" ${readOnly?'disabled':''} aria-label="Điểm cho ${esc(labelVi(c.name))}, tối đa ${c.weight}" data-input="fbScore" data-idx="${k}" data-max="${c.weight}"><div class="field-msg"></div></div></td>
        <td><input class="input sm" value="${esc(d.comments[k]||'')}" placeholder="Nhập nhận xét…" ${readOnly?'disabled':''} aria-label="Nhận xét cho ${esc(labelVi(c.name))}" data-input="fbComment" data-idx="${k}" style="min-width:220px"></td>
      </tr>`).join('')}</tbody>
    </table></div>
  </section>
  <section class="card mt-5"><div class="card-header"><h2 class="card-title">Tổng kết</h2></div><div class="card-body">
    <div class="score-summary" id="fb-summary">${fbSummary(crit,d,passing)}</div>
    <div class="mt-5" data-field="fb-rec"><div class="label" id="rec-label">Đề xuất tuyển dụng${readOnly?'':'<span class="req">*</span>'}</div>
      <div class="rec-options mt-2" role="radiogroup" aria-labelledby="rec-label">${RECOMMENDATIONS.map(r=>`<label class="rec-option"><input type="radio" name="fb-rec" value="${r}" ${d.rec===r?'checked':''} ${readOnly?'disabled':''} data-change="fbRec">${labelVi(r)}</label>`).join('')}</div>
      <div class="field-msg mt-2"></div></div>
    <div class="mt-5">${field({id:'fb-overall',label:'Overall Comment',required:!readOnly,help:'Tối thiểu 10 ký tự',control:textarea('fb-overall',{value:d.overall,rows:4,disabled:readOnly,placeholder:'Đánh giá tổng quan, điểm mạnh, điểm cần cải thiện…',attrs:'data-input="fbOverall"'})})}</div>
  </div></section>
  ${!readOnly?`<div class="sticky-actions"><span class="small muted row" style="gap:6px">${icon('info')}Sau khi gửi, nhận xét không thể chỉnh sửa.</span><div class="btn-group">${btn('Cancel',{variant:'ghost',action:'go',data:{page:'interviews'}})}${btn('Save Draft',{ic:'download',action:'fbSaveDraft'})}${btn('Gửi nhận xét',{variant:'primary',ic:'send',action:'fbSubmit'})}</div></div>`:''}`}`;
};
function fbCalc(crit, d, passing){
  const total = d.scores.reduce((x,y)=>x+(Number(y)||0),0);
  const filled = d.scores.every(s=>s!=='' && s!=null);
  const mandatoryFail = crit.filter((c,k)=>c.mandatory && d.scores[k]!=='' && Number(d.scores[k]) < c.weight*0.5).map(c=>c.name);
  const pass = total>=passing && !mandatoryFail.length;
  return {total, filled, mandatoryFail, pass};
}
function fbSummary(crit, d, passing){
  const {total, filled, mandatoryFail, pass} = fbCalc(crit,d,passing);
  return `<div class="score-box"><div class="l">Tổng điểm</div><div class="v">${total}<span class="muted" style="font-size:15px"> / 100</span></div>${progress(total, total>=passing?'success':'danger')}</div>
    <div class="score-box"><div class="l">Điểm đạt yêu cầu</div><div class="v">${passing}</div><div class="xs subtle">+ tiêu chí bắt buộc đạt ≥ 50%</div></div>
    <div class="score-box ${filled?(pass?'result-pass':'result-fail'):''}"><div class="l">Kết quả dự kiến</div><div class="v row" style="gap:6px">${filled?(pass?icon('checkCircle')+'Đạt':icon('xCircle')+'Không đạt'):'<span class="muted" style="font-size:16px">Nhập đầy đủ điểm</span>'}</div><div class="xs ${mandatoryFail.length?'text-danger':'subtle'}">${mandatoryFail.length?`Dưới 50%: ${esc(mandatoryFail.map(labelVi).join(', '))}`:(filled?(total>=passing?'Đạt điểm yêu cầu':'Chưa đạt điểm yêu cầu'):'Dự đoán tự động')}</div></div>`;
}
