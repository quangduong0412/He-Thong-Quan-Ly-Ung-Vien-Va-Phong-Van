"use strict";

/* ----------------------------------------------------------------- SETTINGS */
PAGES.settings = () => {
  if(!PERM.viewSettings()) return `${pageHeader('Cài đặt tuyển dụng','Cấu hình chung cho phân hệ tuyển dụng.')}<div class="card">${permissionDenied()}</div>`;
  const edit = PERM.editSettings();
  const s = state.settingsDraft || (state.settingsDraft = clone(state.settings));
  return `${pageHeader('Cài đặt tuyển dụng','Cấu hình chung cho phân hệ tuyển dụng.')}
  ${edit?'':`<div class="mb-4">${alertBox('info','Chỉ xem','Vai trò hiện tại chỉ được xem. Chỉ Trưởng phòng nhân sự và Quản trị hệ thống được chỉnh sửa.')}</div>`}
  <section class="card" style="max-width:900px"><div class="card-header"><h2 class="card-title">${icon('settings')}Cấu hình chung</h2></div>
    <div class="card-body" style="padding-top:4px;padding-bottom:4px" id="settings-form">
      <div class="setting-row"><div class="setting-text"><strong>Thời hạn tuyển dụng mặc định</strong><span>Số ngày mặc định để hoàn thành một yêu cầu tuyển dụng.</span></div><div class="setting-control">${field({id:'st-duration',label:'Số ngày',control:`<div class="input-wrap">${input('st-duration',{type:'number',value:s.duration,disabled:!edit,attrs:'min="1" max="365" data-input="settingField" data-key="duration"'})}<span class="suffix">ngày</span></div>`})}</div></div>
      <div class="setting-row"><div class="setting-text"><strong>Số lượng nhân sự tối đa mỗi yêu cầu</strong><span>Số lượng tối đa trên một yêu cầu tuyển dụng.</span></div><div class="setting-control">${field({id:'st-max',label:'Số người',control:input('st-max',{type:'number',value:s.maxEmployees,disabled:!edit,attrs:'min="1" max="100" data-input="settingField" data-key="maxEmployees"'})})}</div></div>
      <div class="setting-row"><div class="setting-text"><strong>Bắt buộc khai báo khoảng lương</strong><span>Bắt buộc nhập khoảng lương khi gửi yêu cầu.</span></div><div class="setting-control"><label class="switch"><input type="checkbox" role="switch" ${s.requireSalary?'checked':''} ${edit?'':'disabled'} data-change="settingField" data-key="requireSalary"><span>${s.requireSalary?'Bắt buộc':'Không bắt buộc'}</span></label></div></div>
      <div class="setting-row"><div class="setting-text"><strong>Yêu cầu Tổng Giám đốc phê duyệt</strong><span>Thêm bước phê duyệt của Tổng Giám đốc sau bước nhân sự xét duyệt.</span></div><div class="setting-control"><label class="switch"><input type="checkbox" role="switch" ${s.requireGD?'checked':''} ${edit?'':'disabled'} data-change="settingField" data-key="requireGD"><span>${s.requireGD?'Đã bật':'Đã tắt'}</span></label></div></div>
      <div class="setting-row"><div class="setting-text"><strong>Cho phép tuyển dụng khẩn cấp</strong><span>Cho phép chọn mức độ ưu tiên khẩn cấp.</span></div><div class="setting-control"><label class="switch"><input type="checkbox" role="switch" ${s.allowUrgent?'checked':''} ${edit?'':'disabled'} data-change="settingField" data-key="allowUrgent"><span>${s.allowUrgent?'Được phép':'Không được phép'}</span></label></div></div>
      <div class="setting-row"><div class="setting-text"><strong>Trưởng phòng nhân sự mặc định</strong><span>Người nhận mặc định ở bước nhân sự xét duyệt.</span></div><div class="setting-control">${field({id:'st-hrm',label:'Trưởng phòng nhân sự',control:select('st-hrm',HR_OFFICERS,{value:s.hrManager,disabled:!edit,attrs:'data-change="settingField" data-key="hrManager"'})})}</div></div>
    </div>
    <div class="card-footer">${btn('Đặt lại',{variant:'ghost',ic:'refresh',action:'resetSettings',disabled:!edit})}${btn('Lưu thay đổi',{variant:'primary',ic:'check',action:'saveSettings',disabled:!edit,tip:edit?'':'Chỉ Trưởng phòng nhân sự hoặc Quản trị hệ thống được chỉnh sửa'})}</div>
  </section>`;
};
