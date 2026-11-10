"use strict";

"use strict";
/* =====================================================================
   1. ICONS — inline SVG (không dùng CDN)
   ===================================================================== */
var ICON_PATHS = {
  home:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  chart:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  menu:'<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  sidebar:'<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>',
  search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  bell:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  sun:'<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  moon:'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  chevDown:'<polyline points="6 9 12 15 18 9"/>',
  chevRight:'<polyline points="9 18 15 12 9 6"/>',
  chevLeft:'<polyline points="15 18 9 12 15 6"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  more:'<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  moreH:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  checkCircle:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  xCircle:'<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  alert:'<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  alertCircle:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  info:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  video:'<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  pin:'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  list:'<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  kanban:'<rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="4" height="8" rx="1"/>',
  arrowLeft:'<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  arrowRight:'<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  paperclip:'<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  message:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  activity:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  history:'<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><polyline points="12 7 12 12 15 14"/>',
  send:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  trendUp:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  trendDown:'<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
  minus:'<line x1="5" y1="12" x2="19" y2="12"/>',
  inbox:'<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  refresh:'<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  filter:'<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  star:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  mail:'<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  dollar:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  building:'<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="18"/><line x1="15" y1="22" x2="15" y2="18"/><line x1="8" y1="6" x2="8.01" y2="6"/><line x1="12" y1="6" x2="12.01" y2="6"/><line x1="16" y1="6" x2="16.01" y2="6"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="12" y1="10" x2="12.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/><line x1="8" y1="14" x2="8.01" y2="14"/><line x1="12" y1="14" x2="12.01" y2="14"/><line x1="16" y1="14" x2="16.01" y2="14"/>',
  flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  userCheck:'<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>',
  userX:'<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>',
  rotate:'<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  layers:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  award:'<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
  hourglass:'<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22"/><path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
};
function icon(name, cls=''){ return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON_PATHS[name]||''}</svg>`; }

/* =====================================================================
   2. SAMPLE DATA — dữ liệu mẫu khai báo trực tiếp (không gọi API)
   Khi chuyển sang React + Frappe, các mảng này sẽ được thay bằng
   frappe.client.get_list / REST /api/resource/<DocType>.
   ===================================================================== */
var TODAY = '2026-11-10';
var NOW_HOUR = 10.5; // 10:30 — dùng để vẽ "now line" trên calendar
var DEPTS = ['Phòng Công nghệ','Phòng Nhân sự','Phòng Kinh doanh','Phòng Marketing','Phòng Tài chính','Phòng Vận hành'];
var ROLES = [
  {key:'Recruitment Requester', user:'Đặng Quang Minh', title:'Team Lead · Phòng Công nghệ'},
  {key:'Department Manager',   user:'Phạm Văn Long',   title:'Trưởng phòng Công nghệ'},
  {key:'HR Officer',           user:'Đỗ Thị Mai',      title:'Chuyên viên tuyển dụng'},
  {key:'HR Manager',           user:'Vũ Ngọc Lan',     title:'Trưởng phòng Nhân sự'},
  {key:'Interviewer',          user:'Bùi Thanh Sơn',   title:'Tech Lead · Phòng Công nghệ'},
  {key:'General Director',     user:'Nguyễn Hữu Phước',title:'Tổng Giám đốc'},
  {key:'System Manager',       user:'Nguyễn Quang Dương',    title:'Quản trị hệ thống'},
];
var HR_OFFICERS = ['Đỗ Thị Mai','Hoàng Minh Tuấn','Vũ Ngọc Lan'];
var INTERVIEWERS = ['Bùi Thanh Sơn','Phạm Văn Long','Trịnh Khánh Linh','Lý Quang Vinh','Vũ Ngọc Lan','Đỗ Thị Mai','Hoàng Minh Tuấn'];
var EMP_TYPES = ['Full-time','Part-time','Contract','Internship'];
var PRIORITIES = ['Low','Normal','High','Urgent'];
var REQ_STATES = ['Draft','Pending Department Approval','Pending HR Review','Pending Director Approval','Revision Required','Approved','Rejected','Cancelled'];
var OPEN_STATES = ['Draft','Pending Department Approval','Pending HR Review','Pending Director Approval','Revision Required','Approved'];
var CATEGORIES = ['New Position','Replacement','Expansion','Seasonal'];
var STAGES = ['New','Screening','Interview Scheduled','Interviewing','Passed','Rejected','Offer Sent','Hired'];
var SOURCES = ['LinkedIn','TopCV','VietnamWorks','Referral','Company Website','Facebook'];
var ROUNDS = ['HR Screening','Technical Interview','Final Interview','Culture Fit'];
var INT_STATUSES = ['Scheduled','In Progress','Completed','Cancelled','No Show'];
var FB_STATUSES = ['Not Started','Pending','Submitted','Not Required'];
var OFFER_STATUSES = ['Draft','Pending Approval','Approved','Sent','Accepted','Declined','Expired','Cancelled'];
var EVAL_METHODS = ['CV Screening','Interview','Technical Test','Case Study','Role Play','Reference Check'];
var RECOMMENDATIONS = ['Strong Hire','Hire','Consider','No Hire','Strong No Hire'];

var CRIT = {
  tech:[
    {name:'Technical Skills',desc:'Nắm vững ngôn ngữ, framework và kiến trúc liên quan',weight:35,mandatory:true,minReq:'≥ 2 năm với stack chính',method:'Technical Test'},
    {name:'Problem Solving',desc:'Phân tích và giải quyết vấn đề thực tế',weight:20,mandatory:false,minReq:'Hoàn thành live coding mức trung bình',method:'Interview'},
    {name:'Relevant Experience',desc:'Kinh nghiệm dự án tương đương',weight:20,mandatory:true,minReq:'Tham gia ≥ 2 dự án production',method:'CV Screening'},
    {name:'Communication',desc:'Trình bày rõ ràng, phối hợp nhóm',weight:15,mandatory:false,minReq:'Đọc hiểu tài liệu tiếng Anh',method:'Interview'},
    {name:'Culture Fit',desc:'Phù hợp giá trị và văn hóa công ty',weight:10,mandatory:false,minReq:'—',method:'Interview'},
  ],
  sales:[
    {name:'Sales Experience',desc:'Kinh nghiệm bán hàng B2B/B2C',weight:30,mandatory:true,minReq:'≥ 1 năm bán hàng',method:'CV Screening'},
    {name:'Negotiation',desc:'Kỹ năng đàm phán và chốt deal',weight:25,mandatory:false,minReq:'Đạt yêu cầu bài role play',method:'Role Play'},
    {name:'Communication',desc:'Giao tiếp, thuyết phục khách hàng',weight:20,mandatory:true,minReq:'Trình bày mạch lạc',method:'Interview'},
    {name:'Customer Orientation',desc:'Hiểu nhu cầu và chăm sóc khách hàng',weight:15,mandatory:false,minReq:'—',method:'Case Study'},
    {name:'Culture Fit',desc:'Phù hợp văn hóa công ty',weight:10,mandatory:false,minReq:'—',method:'Interview'},
  ],
  general:[
    {name:'Professional Knowledge',desc:'Kiến thức chuyên môn theo vị trí',weight:35,mandatory:true,minReq:'Bằng cấp chuyên ngành phù hợp',method:'Interview'},
    {name:'Relevant Experience',desc:'Kinh nghiệm làm việc liên quan',weight:25,mandatory:false,minReq:'≥ 1 năm',method:'CV Screening'},
    {name:'Communication',desc:'Giao tiếp và trình bày',weight:20,mandatory:false,minReq:'—',method:'Interview'},
    {name:'Teamwork',desc:'Khả năng làm việc nhóm',weight:10,mandatory:false,minReq:'—',method:'Interview'},
    {name:'Culture Fit',desc:'Phù hợp văn hóa công ty',weight:10,mandatory:false,minReq:'—',method:'Interview'},
  ],
};
var clone = o => JSON.parse(JSON.stringify(o));

function R(code,title,position,dept,headcount,hired,priority,state,requestDate,startDate,empType,salaryMin,salaryMax,requester,category,crit,reason){
  return {code,title,position,dept,headcount,hired,priority,state,requestDate,startDate,empType,salaryMin,salaryMax,requester,category,
    critTemplate:crit, criteria:clone(CRIT[crit]), reason,
    jd:`• Tham gia phát triển và vận hành các nghiệp vụ của ${dept}.\n• Phối hợp với các nhóm liên quan để hoàn thành mục tiêu quý.\n• Báo cáo tiến độ định kỳ cho quản lý trực tiếp.\n\nYêu cầu: có kinh nghiệm phù hợp với tiêu chí tuyển dụng, tinh thần trách nhiệm cao, ưu tiên ứng viên mong muốn gắn bó lâu dài.`,
    comments:[], revisionAt:null, rejectedAt:null};
}
var REQUESTS = [
  R('REQ-2026-001','Tuyển lập trình viên phía máy chủ cho dự án ngân hàng số','Backend Developer','Phòng Công nghệ',3,1,'High','Approved','2026-09-15','2026-12-01','Full-time',25e6,40e6,'Đặng Quang Minh','Expansion','tech','Mở rộng nhóm phát triển hệ thống ngân hàng số để đáp ứng lộ trình tích hợp ngân hàng trong quý I/2027.'),
  R('REQ-2026-002','Tuyển lập trình viên giao diện cho cổng thông tin khách hàng','Frontend Developer','Phòng Công nghệ',2,0,'Normal','Approved','2026-10-02','2026-12-15','Full-time',20e6,32e6,'Đặng Quang Minh','New Position','tech','Xây dựng cổng thông tin khách hàng mới bằng ReactJS, cần bổ sung 2 nhân sự phát triển giao diện.'),
  R('REQ-2026-003','Bổ sung kỹ sư kiểm thử cho nhóm ứng dụng di động','QA Engineer','Phòng Công nghệ',2,0,'Normal','Approved','2026-10-06','2027-01-05','Full-time',18e6,28e6,'Phạm Văn Long','Expansion','tech','Nâng cao chất lượng phát hành ứng dụng di động và giảm lỗi trên môi trường thực tế.'),
  R('REQ-2026-004','Tuyển chuyên viên kinh doanh tại Hà Nội','Sales Executive','Phòng Kinh doanh',5,2,'Urgent','Approved','2026-09-01','2026-10-15','Full-time',12e6,20e6,'Lý Quang Vinh','Expansion','sales','Mở rộng thị trường miền Bắc, đặt mục tiêu tăng doanh số quý IV thêm 30%.'),
  R('REQ-2026-005','Tuyển chuyên viên nhân sự phụ trách lương thưởng và phúc lợi','HR Officer','Phòng Nhân sự',1,0,'Normal','Pending Director Approval','2026-10-20','2026-12-01','Full-time',15e6,22e6,'Vũ Ngọc Lan','Replacement','general','Thay thế nhân sự nghỉ việc, phụ trách lương thưởng và bảo hiểm.'),
  R('REQ-2026-006','Tuyển chuyên viên tiếp thị số cho chiến dịch Tết','Digital Marketing Specialist','Phòng Marketing',2,0,'High','Revision Required','2026-10-25','2026-12-10','Contract',15e6,25e6,'Đặng Quang Minh','Seasonal','general','Triển khai chiến dịch quảng bá thương hiệu dịp Tết Nguyên đán.'),
  R('REQ-2026-007','Tuyển kế toán trưởng','Chief Accountant','Phòng Tài chính',1,0,'High','Draft','2026-11-06','2027-01-15','Full-time',35e6,50e6,'Đặng Quang Minh','Replacement','general','Kế toán trưởng hiện tại nghỉ hưu vào tháng 01/2027.'),
  R('REQ-2026-008','Tuyển kỹ sư vận hành và phát triển hạ tầng đám mây','DevOps Engineer','Phòng Công nghệ',1,0,'Urgent','Pending HR Review','2026-10-30','2026-12-01','Full-time',30e6,45e6,'Phạm Văn Long','New Position','tech','Chuyển đổi hạ tầng lên điện toán đám mây, cần chuyên gia về quy trình tích hợp, triển khai liên tục và Kubernetes.'),
  R('REQ-2026-009','Tuyển nhân viên hỗ trợ khách hàng theo ca','Customer Support Agent','Phòng Vận hành',4,4,'Low','Approved','2026-08-10','2026-09-15','Full-time',9e6,12e6,'Đặng Quang Minh','Expansion','general','Mở rộng tổng đài hỗ trợ khách hàng hoạt động 24/7.'),
  R('REQ-2026-010','Tuyển chuyên viên phân tích nghiệp vụ cho dự án ERP','Business Analyst','Phòng Công nghệ',1,0,'Normal','Rejected','2026-10-05','2026-11-20','Full-time',22e6,30e6,'Đặng Quang Minh','New Position','tech','Phân tích nghiệp vụ cho dự án triển khai hệ thống ERPNext nội bộ.'),
  R('REQ-2026-011','Tuyển giám sát kho tại Bắc Ninh','Warehouse Supervisor','Phòng Vận hành',1,0,'Low','Cancelled','2026-09-20','2026-11-01','Full-time',14e6,18e6,'Đặng Quang Minh','Replacement','general','Giám sát kho mới tại Bắc Ninh.'),
  R('REQ-2026-012','Tuyển quản lý khách hàng doanh nghiệp trọng điểm','Key Account Manager','Phòng Kinh doanh',2,0,'High','Pending Department Approval','2026-11-07','2027-01-02','Full-time',25e6,40e6,'Lý Quang Vinh','New Position','sales','Phụ trách nhóm khách hàng doanh nghiệp lớn.'),
  R('REQ-2026-013','Tuyển chuyên viên thiết kế giao diện và trải nghiệm người dùng','UI/UX Designer','Phòng Công nghệ',1,0,'Normal','Pending Department Approval','2026-11-08','2027-01-05','Full-time',18e6,28e6,'Đặng Quang Minh','New Position','tech','Chuẩn hóa hệ thống thiết kế cho các sản phẩm nội bộ.'),
];
REQUESTS.find(r=>r.code==='REQ-2026-006').revisionAt = 2;
REQUESTS.find(r=>r.code==='REQ-2026-010').rejectedAt = 3;
REQUESTS[0].comments = [
  {by:'Vũ Ngọc Lan', at:'2026-09-18 14:20', text:'Đã đăng tin trên LinkedIn và TopCV. Dự kiến có danh sách ứng viên phù hợp trong 2 tuần.'},
  {by:'Phạm Văn Long', at:'2026-09-19 09:05', text:'Ưu tiên ứng viên có kinh nghiệm hệ thống thanh toán.'},
];

function A(code,name,gender,dob,reqCode,stage,source,hr,applied,exp,expected,available,tags,company,lastTitle,edu){
  const r = REQUESTS.find(x=>x.code===reqCode);
  const slug = name.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().split(' ');
  return {code,name,gender,dob,reqCode,position:r.position,dept:r.dept,stage,source,hr,applied,exp,expected,available,tags,company,lastTitle,edu,
    email:`${slug[slug.length-1]}.${slug.slice(0,-1).map(s=>s[0]).join('')}@gmail.com`,
    phone:'09'+String((parseInt(code.slice(4),10)*7919357+12345678)%100000000).padStart(8,'0').replace(/(\d{2})(\d{3})(\d{3})/,'$1 $2 $3'),
    address:['Cầu Giấy, Hà Nội','Thanh Xuân, Hà Nội','Đống Đa, Hà Nội','Hà Đông, Hà Nội','Long Biên, Hà Nội'][parseInt(code.slice(4),10)%5],
    rejectReason:null};
}
var APPLICANTS = [
  A('APP-0001','Nguyễn Minh Anh','Female','1996-04-12','REQ-2026-001','Interviewing','LinkedIn','Đỗ Thị Mai','2026-10-12',4,32e6,'2026-12-01',['Java','Spring Boot'],'FPT Software','Backend Engineer','ĐH Bách khoa Hà Nội'),
  A('APP-0002','Trần Quốc Huy','Male','1993-08-03','REQ-2026-001','Passed','Referral','Đỗ Thị Mai','2026-10-05',6,38e6,'2026-12-15',['Go','Microservices'],'VNG','Senior Backend Engineer','ĐH Công nghệ – ĐHQGHN'),
  A('APP-0003','Lê Thu Hà','Female','1998-01-22','REQ-2026-002','Interview Scheduled','TopCV','Hoàng Minh Tuấn','2026-10-28',3,25e6,'2026-12-10',['React','TypeScript'],'Tiki','Frontend Developer','ĐH FPT'),
  A('APP-0004','Phạm Gia Bảo','Male','1997-11-30','REQ-2026-004','Offer Sent','VietnamWorks','Hoàng Minh Tuấn','2026-09-20',3,18e6,'2026-11-20',['B2B','CRM'],'Viettel Store','Sales Executive','ĐH Kinh tế Quốc dân'),
  A('APP-0005','Hoàng Thị Ngọc Ánh','Female','1999-06-15','REQ-2026-003','Screening','Company Website','Đỗ Thị Mai','2026-11-02',2,20e6,'2026-12-01',['Manual','API Testing'],'CMC Global','QA Engineer','ĐH Thủy lợi'),
  A('APP-0006','Vũ Đức Thắng','Male','1994-02-09','REQ-2026-001','Hired','LinkedIn','Đỗ Thị Mai','2026-09-25',5,35e6,'2026-11-15',['Java','Kafka'],'MoMo','Backend Engineer','ĐH Bách khoa Hà Nội'),
  A('APP-0007','Đặng Thùy Linh','Female','1996-09-19','REQ-2026-002','Interviewing','Referral','Hoàng Minh Tuấn','2026-10-20',4,28e6,'2026-12-01',['Vue','React'],'Shopee','Frontend Engineer','ĐH Công nghệ – ĐHQGHN'),
  A('APP-0008','Bùi Văn Khoa','Male','1999-03-27','REQ-2026-004','Hired','Facebook','Hoàng Minh Tuấn','2026-09-10',2,15e6,'2026-10-15',['Retail'],'Thế Giới Di Động','Sales Associate','ĐH Thương mại'),
  A('APP-0009','Ngô Thanh Tâm','Male','1997-07-07','REQ-2026-001','Screening','TopCV','Đỗ Thị Mai','2026-11-05',3,28e6,'2027-01-02',['Node.js'],'Sun*','Software Engineer','ĐH Giao thông Vận tải'),
  A('APP-0010','Dương Hải Yến','Female','1995-12-01','REQ-2026-003','Interview Scheduled','LinkedIn','Đỗ Thị Mai','2026-10-25',4,24e6,'2026-12-01',['Automation','Selenium'],'NashTech','Senior QA','ĐH Bách khoa Hà Nội'),
  A('APP-0011','Lý Minh Khang','Male','1995-05-18','REQ-2026-004','Hired','Referral','Hoàng Minh Tuấn','2026-09-08',4,20e6,'2026-10-15',['B2B','Banking'],'Techcombank','Relationship Officer','Học viện Ngân hàng'),
  A('APP-0012','Phan Thị Hồng Nhung','Female','2000-10-10','REQ-2026-009','Hired','Facebook','Hoàng Minh Tuấn','2026-08-20',1,10e6,'2026-09-15',['Call Center'],'Concentrix','CS Agent','CĐ FPT Polytechnic'),
  A('APP-0013','Trương Công Định','Male','1998-04-04','REQ-2026-001','Rejected','VietnamWorks','Đỗ Thị Mai','2026-10-01',2,30e6,'2026-11-15',['PHP'],'Freelancer','Web Developer','ĐH Mở Hà Nội'),
  A('APP-0014','Mai Anh Thư','Female','2001-02-14','REQ-2026-002','New','Company Website','Hoàng Minh Tuấn','2026-11-08',1,15e6,'2026-12-15',['HTML/CSS','React'],'Startup ABC','Junior Frontend','ĐH FPT'),
  A('APP-0015','Hồ Quang Hiếu','Male','1993-11-11','REQ-2026-003','Passed','Referral','Đỗ Thị Mai','2026-10-10',5,27e6,'2026-12-01',['Automation','Appium'],'KMS Technology','QA Lead','ĐH Bách khoa Đà Nẵng'),
  A('APP-0016','Đinh Bảo Ngọc','Female','1998-08-08','REQ-2026-004','Interview Scheduled','TopCV','Hoàng Minh Tuấn','2026-10-30',2,16e6,'2026-12-01',['B2C'],'Vinmart','Sales Executive','ĐH Thương mại'),
  A('APP-0017','Tạ Minh Quân','Male','1996-06-06','REQ-2026-002','Rejected','LinkedIn','Hoàng Minh Tuấn','2026-10-15',3,30e6,'2026-12-01',['Angular'],'Misa','Frontend Developer','ĐH Công nghệ – ĐHQGHN'),
  A('APP-0018','Cao Thị Lan Hương','Female','1999-09-09','REQ-2026-009','Hired','Company Website','Hoàng Minh Tuấn','2026-08-18',2,11e6,'2026-09-15',['Call Center','English'],'Teleperformance','CS Agent','ĐH Hà Nội'),
  A('APP-0019','Lâm Tuấn Kiệt','Male','1997-12-24','REQ-2026-001','New','LinkedIn','Đỗ Thị Mai','2026-11-09',4,33e6,'2027-01-02',['Java','AWS'],'Grab','Backend Engineer','ĐH Bách khoa TP.HCM'),
  A('APP-0020','Võ Hoàng Yến','Female','1995-03-03','REQ-2026-003','Offer Sent','VietnamWorks','Đỗ Thị Mai','2026-10-02',4,26e6,'2026-12-01',['Automation','Performance'],'Fsoft','QA Engineer','ĐH Kinh tế – ĐHQGHN'),
  A('APP-0021','Kiều Đức Mạnh','Male','2000-01-01','REQ-2026-004','New','Facebook','Hoàng Minh Tuấn','2026-11-06',1,13e6,'2026-12-01',['Retail'],'Điện Máy Xanh','Sales Associate','ĐH Thương mại'),
  A('APP-0022','Châu Ngọc Diệp','Female','1996-07-21','REQ-2026-002','Passed','Referral','Hoàng Minh Tuấn','2026-10-08',5,27e6,'2026-12-01',['React','Next.js'],'Haravan','Senior Frontend','ĐH Khoa học Tự nhiên'),
  A('APP-0023','Quách Thành Đạt','Male','1998-10-02','REQ-2026-004','Screening','TopCV','Hoàng Minh Tuấn','2026-11-01',2,15e6,'2026-12-01',['B2B'],'Bảo Việt','Sales Executive','ĐH Ngoại thương'),
  A('APP-0024','Tôn Nữ Minh Châu','Female','1997-05-05','REQ-2026-004','Rejected','VietnamWorks','Hoàng Minh Tuấn','2026-09-28',3,19e6,'2026-11-01',['B2C'],'Lotte Mart','Sales Executive','ĐH Huế'),
];
APPLICANTS.find(a=>a.code==='APP-0013').rejectReason='Kinh nghiệm Java chưa đáp ứng tiêu chí bắt buộc.';

function I(code,app,round,date,start,end,interviewers,method,place,status){
  return {code,app,round,date,start,end,interviewers,lead:interviewers[0],method,location:method==='Onsite'?place:'',url:method==='Online'?place:'',status,note:'',feedback:{}};
}
var INTERVIEWS = [
  I('INT-0001','APP-0001','Technical Interview','2026-11-10','14:00','15:30',['Bùi Thanh Sơn','Phạm Văn Long'],'Onsite','Phòng họp Sao Mai – Tầng 8','Scheduled'),
  I('INT-0002','APP-0001','HR Screening','2026-10-20','09:00','09:45',['Đỗ Thị Mai'],'Online','https://meet.google.com/rms-hra-001','Completed'),
  I('INT-0003','APP-0003','Technical Interview','2026-11-11','09:00','10:00',['Bùi Thanh Sơn','Trịnh Khánh Linh'],'Online','https://meet.google.com/rms-fe-003','Scheduled'),
  I('INT-0004','APP-0007','Technical Interview','2026-11-09','15:00','16:00',['Bùi Thanh Sơn','Trịnh Khánh Linh'],'Onsite','Phòng họp Hoàng Hôn – Tầng 8','Completed'),
  I('INT-0005','APP-0010','Technical Interview','2026-11-12','09:30','10:30',['Trịnh Khánh Linh'],'Online','https://teams.microsoft.com/l/rms-qa-005','Scheduled'),
  I('INT-0006','APP-0016','Final Interview','2026-11-12','14:00','15:00',['Lý Quang Vinh','Vũ Ngọc Lan'],'Onsite','Phòng họp Bình Minh – Tầng 5','Scheduled'),
  I('INT-0007','APP-0002','Final Interview','2026-11-04','10:00','11:00',['Phạm Văn Long','Bùi Thanh Sơn'],'Onsite','Phòng họp Sao Mai – Tầng 8','Completed'),
  I('INT-0008','APP-0015','Technical Interview','2026-11-05','14:00','15:00',['Trịnh Khánh Linh'],'Online','https://meet.google.com/rms-qa-008','Completed'),
  I('INT-0009','APP-0022','Technical Interview','2026-11-06','09:00','10:00',['Bùi Thanh Sơn'],'Online','https://meet.google.com/rms-fe-009','Completed'),
  I('INT-0010','APP-0023','HR Screening','2026-11-13','10:00','10:30',['Hoàng Minh Tuấn'],'Online','https://meet.google.com/rms-hr-010','Scheduled'),
  I('INT-0011','APP-0009','HR Screening','2026-11-09','10:00','10:30',['Đỗ Thị Mai'],'Online','https://meet.google.com/rms-hr-011','No Show'),
  I('INT-0012','APP-0005','HR Screening','2026-11-13','15:00','15:45',['Đỗ Thị Mai'],'Online','https://meet.google.com/rms-hr-012','Scheduled'),
  I('INT-0013','APP-0020','Final Interview','2026-10-28','14:00','15:00',['Phạm Văn Long','Trịnh Khánh Linh'],'Onsite','Phòng họp Sao Mai – Tầng 8','Completed'),
  I('INT-0014','APP-0007','Culture Fit','2026-11-10','10:00','10:45',['Vũ Ngọc Lan'],'Onsite','Phòng họp Bình Minh – Tầng 5','In Progress'),
  I('INT-0015','APP-0016','HR Screening','2026-11-03','11:00','11:30',['Hoàng Minh Tuấn'],'Online','https://meet.google.com/rms-hr-015','Completed'),
  I('INT-0016','APP-0017','Technical Interview','2026-10-22','09:00','10:00',['Bùi Thanh Sơn'],'Online','https://meet.google.com/rms-fe-016','Cancelled'),
];

/* Seed feedback (điểm sinh theo trọng số tiêu chí) */
function seedFeedback(intCode, interviewer, factor, rec, comment, at){
  const iv = INTERVIEWS.find(i=>i.code===intCode);
  const crit = criteriaForInterview(iv);
  const scores = crit.map((c,i)=>Math.min(c.weight, Math.max(0, Math.round(c.weight*factor*(0.9+0.2*(((i+1)*37)%10)/10)))));
  iv.feedback[interviewer] = {scores, comments:crit.map(()=> ''), rec, overall:comment, status:'Submitted', submittedAt:at};
}
function criteriaForInterview(iv){ const a = APPLICANTS.find(x=>x.code===iv.app); return REQUESTS.find(r=>r.code===a.reqCode).criteria; }
seedFeedback('INT-0002','Đỗ Thị Mai',0.8,'Hire','Ứng viên giao tiếp tốt, định hướng rõ ràng, phù hợp văn hóa.','2026-10-20 11:10');
seedFeedback('INT-0004','Trịnh Khánh Linh',0.78,'Hire','Kiến thức React vững, xử lý state tốt. Cần cải thiện testing.','2026-11-09 17:30');
seedFeedback('INT-0007','Phạm Văn Long',0.86,'Strong Hire','Kinh nghiệm microservices rất phù hợp dự án Core Banking.','2026-11-04 14:00');
seedFeedback('INT-0007','Bùi Thanh Sơn',0.82,'Hire','Thiết kế hệ thống tốt, mã nguồn rõ ràng. Đề xuất gửi thư mời ở cấp bậc cao cấp.','2026-11-04 15:20');
seedFeedback('INT-0008','Trịnh Khánh Linh',0.84,'Hire','Kinh nghiệm automation phong phú, có thể lead nhóm QA nhỏ.','2026-11-05 16:40');
seedFeedback('INT-0009','Bùi Thanh Sơn',0.8,'Hire','Nắm vững Next.js và kỹ thuật tối ưu hiệu năng.','2026-11-06 11:15');
seedFeedback('INT-0013','Phạm Văn Long',0.77,'Hire','Phù hợp, mong muốn lương trong khung.','2026-10-28 16:00');
seedFeedback('INT-0013','Trịnh Khánh Linh',0.74,'Consider','Cần thêm kinh nghiệm kiểm thử hiệu năng.','2026-10-28 16:30');
seedFeedback('INT-0015','Hoàng Minh Tuấn',0.75,'Hire','Thái độ tốt, có kinh nghiệm bán hàng B2C.','2026-11-03 13:00');










function O(code,app,salary,startDate,deadline,status,createdBy,approver,declineReason){
  const a = APPLICANTS.find(x=>x.code===app);
  return {code,app,applicant:a.name,position:a.position,dept:a.dept,salary,startDate,deadline,status,createdBy,approver,declineReason:declineReason||null,createdAt:'',
    terms:`1. Thời gian thử việc: 02 tháng, hưởng 100% lương.\n2. Thời gian làm việc: Thứ Hai – Thứ Sáu, 08:30 – 17:30.\n3. Phúc lợi: Đầy đủ bảo hiểm xã hội, bảo hiểm y tế; bảo hiểm sức khỏe PVI; 13 ngày phép/năm; thưởng tháng lương thứ 13 theo hiệu quả công việc.\n4. Địa điểm: Tòa nhà Capital, 72 Trần Hưng Đạo, Hà Nội.\n5. Thư mời có hiệu lực đến hết ngày ${deadline.split('-').reverse().join('/')}.`};
}
var OFFERS = [
  O('OFF-2026-001','APP-0004',18e6,'2026-11-20','2026-11-07','Sent','Hoàng Minh Tuấn','Vũ Ngọc Lan'),
  O('OFF-2026-002','APP-0020',26e6,'2026-12-01','2026-11-14','Sent','Đỗ Thị Mai','Vũ Ngọc Lan'),
  O('OFF-2026-003','APP-0002',38e6,'2026-12-15','2026-11-20','Pending Approval','Đỗ Thị Mai',null),
  O('OFF-2026-004','APP-0015',26e6,'2026-12-01','2026-11-25','Draft','Đỗ Thị Mai',null),
  O('OFF-2026-005','APP-0022',27e6,'2026-12-01','2026-11-18','Approved','Hoàng Minh Tuấn','Vũ Ngọc Lan'),
  O('OFF-2026-006','APP-0006',35e6,'2026-11-15','2026-10-30','Accepted','Đỗ Thị Mai','Nguyễn Hữu Phước'),
  O('OFF-2026-007','APP-0008',15e6,'2026-10-15','2026-10-05','Accepted','Hoàng Minh Tuấn','Vũ Ngọc Lan'),
  O('OFF-2026-008','APP-0013',29e6,'2026-11-15','2026-10-12','Declined','Đỗ Thị Mai','Vũ Ngọc Lan','Ứng viên đã nhận thư mời từ công ty khác với mức lương cao hơn.'),
  O('OFF-2026-009','APP-0024',17e6,'2026-11-01','2026-10-20','Expired','Hoàng Minh Tuấn','Vũ Ngọc Lan'),
  O('OFF-2026-010','APP-0017',28e6,'2026-11-15','2026-10-25','Cancelled','Hoàng Minh Tuấn',null),
];

/* Audit trail — REQ-2026-001 được viết chi tiết (≥ 10 sự kiện); các request khác sinh tự động */
var AUDIT = {
  'REQ-2026-001':[
    {actor:'Đặng Quang Minh',role:'Recruitment Requester',time:'2026-09-15 09:12',action:'Created',from:null,to:'Draft',changes:[]},
    {actor:'Đặng Quang Minh',role:'Recruitment Requester',time:'2026-09-15 09:40',action:'Updated',from:null,to:null,changes:[['Number of Employees','2','3'],['Priority','Normal','High']]},
    {actor:'Đặng Quang Minh',role:'Recruitment Requester',time:'2026-09-15 10:05',action:'Submitted for Approval',from:'Draft',to:'Pending Department Approval',changes:[]},
    {actor:'Phạm Văn Long',role:'Department Manager',time:'2026-09-16 08:50',action:'Approved',from:'Pending Department Approval',to:'Pending HR Review',changes:[]},
    {actor:'Vũ Ngọc Lan',role:'HR Manager',time:'2026-09-16 15:30',action:'Requested Revision',from:'Pending HR Review',to:'Revision Required',changes:[],reason:'Khung lương tối đa 35M thấp hơn mặt bằng thị trường cho vị trí Senior. Đề nghị điều chỉnh để thu hút ứng viên.'},
    {actor:'Đặng Quang Minh',role:'Recruitment Requester',time:'2026-09-17 09:15',action:'Updated',from:null,to:null,changes:[['Maximum Salary','35.000.000 ₫','40.000.000 ₫'],['Expected Start Date','15/11/2026','01/12/2026']],sensitive:[0]},
    {actor:'Đặng Quang Minh',role:'Recruitment Requester',time:'2026-09-17 09:20',action:'Resubmitted',from:'Revision Required',to:'Pending Department Approval',changes:[]},
    {actor:'Phạm Văn Long',role:'Department Manager',time:'2026-09-17 11:00',action:'Approved',from:'Pending Department Approval',to:'Pending HR Review',changes:[]},
    {actor:'Vũ Ngọc Lan',role:'HR Manager',time:'2026-09-17 16:45',action:'Approved',from:'Pending HR Review',to:'Pending Director Approval',changes:[]},
    {actor:'Nguyễn Hữu Phước',role:'General Director',time:'2026-09-18 10:10',action:'Approved',from:'Pending Director Approval',to:'Approved',changes:[]},
    {actor:'Đỗ Thị Mai',role:'HR Officer',time:'2026-11-01 16:00',action:'Updated',from:null,to:null,changes:[['Hired Count','0','1']]},
  ],
};
function seedAudit(r){
  const path = ['Draft','Pending Department Approval','Pending HR Review','Pending Director Approval','Approved'];
  const actors = [[r.requester,'Recruitment Requester'],['Phạm Văn Long','Department Manager'],['Vũ Ngọc Lan','HR Manager'],['Nguyễn Hữu Phước','General Director']];
  const ev = [{actor:r.requester,role:'Recruitment Requester',time:`${r.requestDate} 09:00`,action:'Created',from:null,to:'Draft',changes:[]}];
  const target = {'Draft':0,'Pending Department Approval':1,'Pending HR Review':2,'Pending Director Approval':3,'Approved':4,'Cancelled':4,'Revision Required':r.revisionAt||1,'Rejected':r.rejectedAt||1}[r.state];
  const addDay = (d,n)=>{const [y,m,dd]=d.split('-').map(Number);return new Date(Date.UTC(y,m-1,dd+n)).toISOString().slice(0,10);};
  for(let i=1;i<=target;i++){
    if((r.state==='Revision Required'||r.state==='Rejected') && i===target) break;
    ev.push({actor:actors[i-1][0],role:actors[i-1][1],time:`${addDay(r.requestDate,i-1)} ${i===1?'10:00':'14:30'}`,action:i===1?'Submitted for Approval':'Approved',from:path[i-1],to:path[i],changes:[]});
  }
  if(r.state==='Revision Required') ev.push({actor:'Vũ Ngọc Lan',role:'HR Manager',time:`${addDay(r.requestDate,2)} 15:00`,action:'Requested Revision',from:path[target],to:'Revision Required',changes:[],reason:'Cần làm rõ ngân sách chiến dịch và thời hạn hợp đồng (Contract) cho 2 vị trí.'});
  if(r.state==='Rejected') ev.push({actor:'Nguyễn Hữu Phước',role:'General Director',time:`${addDay(r.requestDate,3)} 11:20`,action:'Rejected',from:path[target],to:'Rejected',changes:[],reason:'Dự án ERP tạm hoãn sang năm 2027, chưa phát sinh nhu cầu tuyển mới.'});
  if(r.state==='Cancelled') ev.push({actor:'Vũ Ngọc Lan',role:'HR Manager',time:`${addDay(r.requestDate,10)} 09:30`,action:'Cancelled',from:'Approved',to:'Cancelled',changes:[],reason:'Kế hoạch mở kho Bắc Ninh lùi sang Q2/2027.'});
  return ev;
}
REQUESTS.forEach(r=>{ if(!AUDIT[r.code]) AUDIT[r.code]=seedAudit(r); });

var PIPELINE = [['New',48],['Screening',31],['Interview Scheduled',19],['Interviewing',17],['Passed',12],['Offer Sent',8],['Hired',9],['Rejected',23]];
var KPIS = [
  {label:'Yêu cầu tuyển dụng đang mở',value:12,change:8.3,icon:'file',tone:'primary',page:'requests',preset:'openRequests'},
  {label:'Tổng số ứng viên',value:148,change:12.5,icon:'users',tone:'info',page:'applicants',preset:'allApplicants'},
  {label:'Phỏng vấn trong tuần này',value:18,change:5.9,icon:'calendar',tone:'warning',page:'interviews',preset:'thisWeek'},
  {label:'Nhận xét đang chờ',value:7,change:16.7,icon:'message',tone:'danger',page:'interviews',preset:'pendingFeedback',goodWhen:'down'},
  {label:'Thư mời đang hiệu lực',value:5,change:0,icon:'briefcase',tone:'primary',page:'offers',preset:'activeOffers'},
  {label:'Đã tuyển trong tháng này',value:9,change:28.6,icon:'userCheck',tone:'success',page:'applicants',preset:'hired'},
];
var NOTIFICATIONS = [
  {id:1,unread:true,icon:'alert',tone:'danger',text:'Thư mời OFF-2026-001 (Phạm Gia Bảo) đã quá hạn phản hồi.',time:'2 giờ trước',go:['offerDetail',{code:'OFF-2026-001'}]},
  {id:2,unread:true,icon:'message',tone:'warning',text:'Nhận xét phỏng vấn của Đặng Thùy Linh còn thiếu 1 người phỏng vấn.',time:'5 giờ trước',go:['applicantDetail',{code:'APP-0007'}]},
  {id:3,unread:true,icon:'file',tone:'primary',text:'REQ-2026-013 – Chuyên viên thiết kế giao diện và trải nghiệm người dùng đang chờ phòng ban phê duyệt.',time:'Hôm qua',go:['requestDetail',{code:'REQ-2026-013'}]},
  {id:4,unread:false,icon:'userCheck',tone:'success',text:'Vũ Đức Thắng đã chấp nhận thư mời cho vị trí Lập trình viên Backend.',time:'3 ngày trước',go:['applicantDetail',{code:'APP-0006'}]},
  {id:5,unread:false,icon:'calendar',tone:'info',text:'Lịch phỏng vấn Lê Thu Hà được xác nhận 11/11 09:00.',time:'4 ngày trước',go:['interviews',{}]},
];
