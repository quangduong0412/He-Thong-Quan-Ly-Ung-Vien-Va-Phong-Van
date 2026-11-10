"use strict";

/* ------------------------------------------------------------------ REPORTS */
var REPORT_TABS = [
  {key:'pipeline',label:'Quy trình ứng viên',icon:'layers'},{key:'interview',label:'Hiệu quả phỏng vấn',icon:'award'},{key:'feedback',label:'Nhận xét đang chờ',icon:'message'},
  {key:'leadtime',label:'Thời gian tuyển dụng',icon:'clock'},{key:'sources',label:'Nguồn tuyển dụng',icon:'target'},{key:'plan',label:'Tiến độ kế hoạch tuyển dụng',icon:'flag'},
];
var PF = () => ({month:0.35, quarter:1, year:3.1}[state.rep.period]);
function reportData(key){
  const k = PF(), sc = n => Math.max(0, Math.round(n*k));
  switch(key){
    case 'pipeline': { const rows = PIPELINE.map(([s,c])=>[s,sc(c)]); const tot=rows.reduce((a,r)=>a+r[1],0)||1;
      return {kpis:[['Total Applicants',tot,'+12%'],['Conversion to Hire',(rows[6][1]/tot*100).toFixed(1)+'%','+0.8pt'],['Avg. Days in Screening','4.2','-0.6d'],['Rejection Rate',(rows[7][1]/tot*100).toFixed(1)+'%','-1.2pt']],
        chart:{type:'hbar', items:rows.map(([s,c])=>({label:s,value:c,color:STAGE_COLOR(s),opacity:STAGE_OPACITY(s)}))},
        cols:['Stage','Applicants','% of Total','Avg. Days in Stage'], rows:rows.map(([s,c],i)=>[s,c,(c/tot*100).toFixed(1)+'%',[2.1,4.2,3.0,2.5,1.8,4.6,'—','—'][i]])}; }
    case 'interview': { const data=[['Bùi Thanh Sơn',14,13,76.4,71,'0.8d'],['Trịnh Khánh Linh',12,12,74.1,67,'0.5d'],['Phạm Văn Long',9,8,79.2,78,'1.6d'],['Vũ Ngọc Lan',8,8,72.0,63,'0.4d'],['Đỗ Thị Mai',11,10,70.3,60,'0.6d'],['Lý Quang Vinh',6,5,73.5,67,'2.1d']].map(r=>[r[0],sc(r[1]),sc(r[2]),r[3],r[4]+'%',r[5]]);
      return {kpis:[['Interviews',data.reduce((a,r)=>a+r[1],0),'+9%'],['Completion Rate','93.3%','+2.1pt'],['No-show Rate','6.3%','-0.9pt'],['Avg. Score','74.3','+1.2']],
        chart:{type:'vbar', items:data.map(r=>({label:firstName(r[0]),value:r[1]}))}, cols:['Interviewer','Interviews','Completed','Avg. Score','Pass Rate','Avg. Feedback Time'], rows:data}; }
    case 'feedback': { const data=[['INT-0004','Đặng Thùy Linh','Bùi Thanh Sơn','09/11/2026',1],['INT-0019','Nguyễn Hoài Nam','Phạm Văn Long','06/11/2026',4],['INT-0021','Trần Bảo Anh','Lý Quang Vinh','05/11/2026',5],['INT-0022','Lê Gia Hân','Bùi Thanh Sơn','07/11/2026',3],['INT-0024','Phạm Đức Duy','Trịnh Khánh Linh','08/11/2026',2],['INT-0025','Hoàng Mai Chi','Phạm Văn Long','03/11/2026',7],['INT-0026','Vũ Khánh Toàn','Lý Quang Vinh','04/11/2026',6]].slice(0, Math.max(1,Math.round(7*Math.min(1,k))));
      const by={}; data.forEach(r=>by[r[2]]=(by[r[2]]||0)+1);
      return {kpis:[['Pending Feedback',data.length,'+2'],['Overdue > 48h',data.filter(r=>r[4]>2).length,'+1'],['Avg. Delay',(data.reduce((a,r)=>a+r[4],0)/data.length).toFixed(1)+'d','+0.3d'],['Interviewers Involved',Object.keys(by).length,'']],
        chart:{type:'vbar', items:Object.entries(by).map(([n,v])=>({label:firstName(n),value:v,color:'var(--warning)'}))}, cols:['Interview','Applicant','Interviewer','Interview Date','Days Overdue'], rows:data}; }
    case 'leadtime': { const months=[['Th6',38],['Th7',35],['Th8',36],['Th9',31],['Th10',29],['Th11',27]];
      return {kpis:[['Avg. Time to Hire','32 days','-4d'],['Avg. Approval Time','6.5 days','-1.2d'],['Fastest Hire','18 days',''],['Slowest Hire','61 days','']],
        chart:{type:'line', items:months.map(([m,v])=>({label:m,value:v}))}, cols:['Position','Department','Approval (days)','Sourcing (days)','Interview (days)','Offer (days)','Total (days)'],
        rows:[['Backend Developer','Phòng Công nghệ',3,12,9,6,30],['Sales Executive','Phòng Kinh doanh',2,8,6,4,20],['Customer Support Agent','Phòng Vận hành',2,6,5,5,18],['QA Engineer','Phòng Công nghệ',4,14,10,7,35],['Frontend Developer','Phòng Công nghệ',5,15,12,8,40]]}; }
    case 'sources': { const data=[['LinkedIn',42,4,'9.5%','4.200.000 ₫'],['TopCV',35,2,'5.7%','2.800.000 ₫'],['Referral',22,4,'18.2%','3.000.000 ₫'],['VietnamWorks',24,1,'4.2%','5.100.000 ₫'],['Company Website',15,2,'13.3%','0 ₫'],['Facebook',10,1,'10.0%','1.500.000 ₫']].map(r=>[r[0],sc(r[1]),sc(r[2]),r[3],r[4]]);
      const colors=['var(--primary)','var(--info)','var(--success)','var(--warning)','var(--danger)','var(--text-3)'];
      return {kpis:[['Top Source','LinkedIn',''],['Best Conversion','Referral 18.2%',''],['Total Sourcing Cost','128M ₫','-6%'],['Avg. Cost per Hire','3.4M ₫','-0.4M']],
        chart:{type:'donut', items:data.map((r,i)=>({label:r[0],value:r[1],color:colors[i]}))}, cols:['Source','Applicants','Hired','Conversion','Cost per Hire'], rows:data}; }
    case 'plan': { const data=REQUESTS.filter(r=>r.state==='Approved').map(r=>[r.code,r.position,r.dept,r.headcount,r.hired,Math.round(r.hired/r.headcount*100)+'%',fmtDate(r.startDate)]);
      const planned=data.reduce((a,r)=>a+r[3],0), hired=data.reduce((a,r)=>a+r[4],0);
      return {kpis:[['Planned Headcount',planned,''],['Hired',hired,'+3'],['Fill Rate',Math.round(hired/planned*100)+'%','+12pt'],['Open Positions',planned-hired,'']],
        chart:{type:'progress', items:data.map(r=>({label:`${r[1]}`,sub:r[0],value:r[4],max:r[3]}))}, cols:['Request','Position','Department','Planned','Hired','Progress','Target Start'], rows:data}; }
  }
}
PAGES.reports = () => {
  const s = state.rep;
  return `${pageHeader('Báo cáo','Báo cáo tuyển dụng — dữ liệu mô phỏng.')}
  ${tabs('report', REPORT_TABS, s.tab)}
  <div class="tab-panel" id="panel-report" role="tabpanel" aria-labelledby="tab-report-${s.tab}">
    <div class="card"><div class="filter-panel" style="border-bottom:0" role="search" aria-label="Bộ lọc báo cáo">
      ${field({id:'rp-period',label:'Khoảng thời gian',control:select('rp-period',[{value:'month',label:'Tháng này'},{value:'quarter',label:'Quý này'},{value:'year',label:'Năm nay'}],{value:s.period})})}
      ${field({id:'rp-dept',label:'Phòng ban',control:select('rp-dept',DEPTS,{value:s.dept,placeholder:'Tất cả phòng ban'})})}
      <div class="filter-actions">${btn('Apply',{variant:'primary',ic:'filter',action:'applyReport'})}${PERM.exportData()?btn('Export CSV',{ic:'download',action:'exportReport'}):''}</div>
      <label class="switch small" style="align-self:center"><input type="checkbox" role="switch" data-change="toggleRepEmpty" ${s.empty?'checked':''}><span>Mô phỏng không có dữ liệu</span></label>
    </div></div>
    <div id="report-body" class="mt-5">${reportBody()}</div>
  </div>`;
};
function reportBody(){
  const s = state.rep;
  if(s.busy) return `<div class="mini-kpis">${'<div class="card mini-kpi"><span class="skeleton" style="width:60%"></span><span class="skeleton lg mt-3" style="width:40%"></span></div>'.repeat(4)}</div><div class="report-grid mt-5">${skeletonBlock()}${skeletonBlock()}</div>`;
  if(s.empty || s.dept==='Phòng Tài chính') return `<div class="card">${emptyState({ic:'chart',title:'Không có dữ liệu phù hợp với bộ lọc',text:'Không có dữ liệu cho khoảng thời gian hoặc phòng ban đã chọn. Thử chọn “Phòng Tài chính” hoặc bật chế độ mô phỏng không có dữ liệu.',actions:btn('Reset filters',{action:'resetReport',ic:'refresh'})})}</div>`;
  const d = reportData(s.tab), tab = REPORT_TABS.find(t=>t.key===s.tab);
  return `<div class="mini-kpis">${d.kpis.map(([l,v,c])=>`<div class="card mini-kpi"><div class="l">${esc(labelVi(l))}</div><div class="v">${esc(labelVi(v))}</div>${c?`<div class="xs subtle">${esc(c)} so với kỳ trước</div>`:'<div class="xs subtle">&nbsp;</div>'}</div>`).join('')}</div>
  <div class="report-grid mt-5">
    <section class="card"><div class="card-header"><h2 class="card-title">${esc(tab.label)}</h2><span class="small muted">${{month:'Tháng này',quarter:'Quý này',year:'Năm nay'}[s.period]}${s.dept?' · '+esc(s.dept):''}</span></div><div class="card-body">${renderChart(d.chart)}</div></section>
    <section class="card"><div class="card-header"><h2 class="card-title">Dữ liệu</h2><span class="small muted">${d.rows.length} dòng</span></div>
      <div class="table-wrap"><table class="table"><thead><tr>${d.cols.map((c,i)=>`<th class="${i>0&&typeof d.rows[0][i]==='number'?'num':''}">${esc(labelVi(c))}</th>`).join('')}</tr></thead>
      <tbody>${d.rows.map(r=>`<tr>${r.map((v,i)=>`<td class="${typeof v==='number'&&i>0?'num':''}">${i===0?`<span class="cell-main">${esc(labelVi(v))}</span>`:esc(labelVi(v))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    </section>
  </div>`;
}
/* React component: Charts (HBar / VBar / Line / Donut / Progress) — SVG/CSS thuần */
function renderChart(c){
  if(c.type==='hbar'){ const max=Math.max(...c.items.map(i=>i.value),1); return `<div role="img" aria-label="Biểu đồ thanh ngang">${c.items.map(i=>`<div class="pipe-row" style="cursor:default"><span class="pipe-label"><span class="pipe-swatch" style="background:${i.color};opacity:${i.opacity||1}"></span>${esc(labelVi(i.label))}</span><span class="pipe-bar"><span style="width:${i.value/max*100}%;background:${i.color};opacity:${i.opacity||1}"></span></span><span class="pipe-val"><strong>${i.value}</strong></span></div>`).join('')}</div>`; }
  if(c.type==='vbar'){ const max=Math.max(...c.items.map(i=>i.value),1); return `<div class="vchart" role="img" aria-label="Biểu đồ cột: ${c.items.map(i=>`${labelVi(i.label)} ${i.value}`).join(', ')}"><div class="vbars">${c.items.map(i=>`<div class="vbar"><span class="vbar-val">${i.value}</span><span class="vbar-fill" style="height:${i.value/max*85}%;${i.color?`background:${i.color}`:''}"></span></div>`).join('')}</div><div class="vbar-labels">${c.items.map(i=>`<span title="${esc(labelVi(i.label))}">${esc(labelVi(i.label))}</span>`).join('')}</div></div>`; }
  if(c.type==='line'){
    const W=560,H=240,P={l:36,r:16,t:20,b:30}; const vals=c.items.map(i=>i.value); const max=Math.ceil(Math.max(...vals)/10)*10+5, min=Math.max(0,Math.floor(Math.min(...vals)/10)*10-5);
    const x=k=>P.l+k*(W-P.l-P.r)/(c.items.length-1), y=v=>P.t+(max-v)/(max-min)*(H-P.t-P.b);
    const pts=c.items.map((it,k)=>`${x(k)},${y(it.value)}`).join(' ');
    const grid=[0,1,2,3,4].map(g=>{const v=min+(max-min)*g/4; return `<line x1="${P.l}" x2="${W-P.r}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--border)"/><text x="${P.l-8}" y="${y(v)+4}" text-anchor="end">${Math.round(v)}</text>`;}).join('');
    return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Biểu đồ đường: thời gian tuyển dụng trung bình theo tháng, ${c.items.map(i=>`${labelVi(i.label)} ${i.value}`).join(', ')}">${grid}
      <polygon points="${P.l},${H-P.b} ${pts} ${W-P.r},${H-P.b}" style="fill:var(--primary);opacity:.10"/>
      <polyline points="${pts}" style="fill:none;stroke:var(--primary);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round"/>
      ${c.items.map((it,k)=>`<circle cx="${x(k)}" cy="${y(it.value)}" r="4.5" style="fill:var(--surface);stroke:var(--primary);stroke-width:2.5"/><text x="${x(k)}" y="${y(it.value)-12}" text-anchor="middle" style="font-weight:600;fill:var(--text)">${it.value}</text><text x="${x(k)}" y="${H-8}" text-anchor="middle">${labelVi(it.label)}</text>`).join('')}
    </svg><div class="chart-legend mt-3"><span><span class="pipe-swatch" style="background:var(--primary)"></span>Thời gian tuyển dụng trung bình (mục tiêu ≤ 30 ngày)</span></div>`;
  }
  if(c.type==='donut'){
    const total=c.items.reduce((a,i)=>a+i.value,0)||1, R=70, C=2*Math.PI*R; let off=0;
    const segs=c.items.map(i=>{const len=i.value/total*C; const s=`<circle cx="90" cy="90" r="${R}" fill="none" style="stroke:${i.color}" stroke-width="26" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}" transform="rotate(-90 90 90)"/>`; off+=len; return s;}).join('');
    return `<div class="donut-wrap"><svg viewBox="0 0 180 180" width="190" height="190" role="img" aria-label="Biểu đồ tròn thể hiện số ứng viên theo nguồn"><circle cx="90" cy="90" r="${R}" fill="none" style="stroke:var(--neutral-soft)" stroke-width="26"/>${segs}<text x="90" y="86" text-anchor="middle" style="font-size:24px;font-weight:700;fill:var(--text)">${total}</text><text x="90" y="106" text-anchor="middle" style="font-size:11px;fill:var(--text-2)">ứng viên</text></svg>
      <div class="donut-legend">${c.items.map(i=>`<div><span class="pipe-swatch" style="background:${i.color}"></span><span>${esc(labelVi(i.label))}</span><span>${i.value} · ${(i.value/total*100).toFixed(0)}%</span></div>`).join('')}</div></div>`;
  }
  if(c.type==='progress') return `<div class="stack">${c.items.map(i=>`<div><div class="row between small mb-3" style="margin-bottom:6px"><span><strong>${esc(labelVi(i.label))}</strong> <span class="subtle">${esc(i.sub)}</span></span><span class="strong">${i.value}/${i.max}</span></div>${progress(i.value/i.max*100, i.value>=i.max?'success':i.value/i.max<0.3?'warning':'')}</div>`).join('')}</div>`;
  return '';
}
