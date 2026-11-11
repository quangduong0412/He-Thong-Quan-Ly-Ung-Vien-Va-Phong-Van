"use strict";

"use strict";
/* =====================================================================
   3. APP STATE — trong React nên tách thành Context / store (Zustand, Redux…)
   ===================================================================== */
var DEFAULT_SETTINGS = {duration:45, maxEmployees:20, requireSalary:true, requireGD:true, allowUrgent:true, hrManager:'Vũ Ngọc Lan'};
var state = {
  page:'dashboard', params:{},
  role: sessionRole('HR Manager'),   // vai trò thật từ phiên Frappe (src/auth.js); 'HR Manager' là mặc định khi `yarn dev`
  theme:'light',
  collapsed:false,
  req:{filters:{search:'',state:'',dept:'',priority:'',empType:'',from:'',to:''}, page:1, size:10, loading:false, loadError:'', records:null, selected:new Set(), showFilters:false},
  app:{view:'table', filters:{search:'',position:'',dept:'',status:'',source:'',hr:''}, page:1, size:10, showFilters:false,loading:false, loadError:'', records:null, selected:new Set()},
  int:{view:'list', filters:{date:'',interviewer:'',round:'',status:'',method:'',feedback:''}, weekStart:'2026-11-09', showFilters:false,loading:false, loadError:'', records:null, selected:new Set()},
  off:{filters:{search:'',status:''}},
  rep:{tab:'pipeline', period:'quarter', dept:'', busy:false, empty:false},
  tab:{request:'overview', applicant:'overview'},
  form:null, formErrors:{}, formDirty:false,
  fb:{},
  settings:clone(DEFAULT_SETTINGS),
  settingsDraft:null,
};
