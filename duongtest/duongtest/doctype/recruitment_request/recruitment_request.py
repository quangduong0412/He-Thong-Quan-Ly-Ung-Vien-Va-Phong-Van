import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate

class RecruitmentRequest(Document):
    def validate(self):
        if not self.requester_:
            self.requester_ = frappe.session.user

        old_doc = getattr(self, "_doc_before_save", None)
        if old_doc:
            old_state = old_doc.get("workflow_state")
            new_state = self.workflow_state

            if old_state != new_state:
                if new_state == "Rejected" and not self.rejection_reason:
                    frappe.throw(_("Bắt buộc nhập lý do từ chối."))

                if new_state == "Revision Required" and not self.revision_note:
                    frappe.throw(_("Bắt buộc nhập nội dung cần chỉnh sửa."))

        settings = frappe.get_single("Recruitment Settings")

        if not self.is_new() and self.docstatus == 0:
            if self.workflow_state in ["Draft", "Revision Required"] and frappe.session.user != self.owner:
                frappe.throw(_("Chỉ người tạo mới có quyền chỉnh sửa yêu cầu này."))

        if not self.number_of_employees or self.number_of_employees <= 0:
            frappe.throw(_("Số lượng nhân sự phải lớn hơn 0."))
        if settings.maximum_requested_employees and self.number_of_employees > settings.maximum_requested_employees:
            frappe.throw(_(f"Số lượng nhân sự không được vượt quá {settings.maximum_requested_employees}."))

        if self.expected_start_date and self.request_date:
            if getdate(self.expected_start_date) <= getdate(self.request_date):
                frappe.throw(_("Ngày dự kiến nhận việc phải lớn hơn ngày tạo yêu cầu."))

        if settings.require_salary_range and (not self.minimum_salary or not self.maximum_salary):
            frappe.throw(_("Bắt buộc nhập cả mức lương tối thiểu và tối đa."))
        if self.minimum_salary and self.maximum_salary and self.maximum_salary < self.minimum_salary:
            frappe.throw(_("Mức lương tối đa phải lớn hơn hoặc bằng mức lương tối thiểu."))

        if self.priority == "Urgent" and not settings.allow_urgent_recruitment:
            frappe.throw(_("Hệ thống chưa cho phép tạo yêu cầu tuyển gấp (Urgent)."))

        if self.recruitment_category and frappe.db.get_value("Recruitment Category", self.recruitment_category, "is_group"):
            frappe.throw(_("Không thể chọn danh mục nhóm. Vui lòng chọn vị trí chi tiết."))

        total_weight, names, has_mandatory = 0, set(), False
        for row in self.table_rvqn:
            criterion_name = (row.criterion_name or "").strip()
            normalized_name = criterion_name.casefold()
            if not criterion_name:
                frappe.throw(_("Tên tiêu chí tuyển dụng không được để trống."))
            if normalized_name in names:
                frappe.throw(_(f"Tiêu chí '{row.criterion_name}' bị trùng lặp."))
            names.add(normalized_name)

            if row.weight is None or not 0 < row.weight <= 100:
                frappe.throw(
                    _(f"Trọng số của '{row.criterion_name}' phải lớn hơn 0 và nhỏ hơn hoặc bằng 100.")
                )

            total_weight += row.weight or 0
            if row.is_mandatory:
                has_mandatory = True


    def on_update_after_submit(self):
        frappe.throw(_("Tài liệu đã được phê duyệt (Submit). Không thể sửa trực tiếp! Vui lòng dùng quy trình Cancel và Amend."))

    def on_cancel(self):
        frappe.msgprint(_(f"Tài liệu {self.name} đã bị hủy bởi {frappe.session.user}."))

    def on_trash(self):
        if frappe.db.exists("Job Applicant", {"recruitment_request": self.name}):
            frappe.throw(_("Không thể xóa yêu cầu tuyển dụng đã có ứng viên; hãy hủy yêu cầu để bảo toàn lịch sử."))

    def before_insert(self):
        self.minimum_salary = 10
        self.maximum_salary = 100
        if self.amended_from:
            if not self.amendment_reason:
                frappe.throw(_("Bắt buộc nhập Lý do điều chỉnh (Amendment Reason) khi Amend tài liệu đã hủy."))