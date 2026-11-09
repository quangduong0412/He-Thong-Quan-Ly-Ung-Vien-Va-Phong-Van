import frappe
from frappe import _
from frappe.model.document import Document

class RecruitmentSettings(Document):
    def validate(self):
        user_roles = frappe.get_roles(frappe.session.user)
        if not {"HR Manager", "System Manager"}.intersection(set(user_roles)):
            frappe.throw(_("Chỉ 'HR Manager' hoặc 'System Manager' mới được sửa cài đặt."))

        if self.default_recruitment_duration and self.default_recruitment_duration <= 0:
            frappe.throw(_("Thời hạn tuyển dụng mặc định phải lớn hơn 0."))

        if self.maximum_requested_employees and self.maximum_requested_employees <= 0:
            frappe.throw(_("Số lượng nhân sự tối đa phải lớn hơn 0."))