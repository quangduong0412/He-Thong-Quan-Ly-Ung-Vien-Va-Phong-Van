# Copyright (c) 2026, Duong Nguyen and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.naming import make_autoname


class JobApplicant(Document):
    def before_insert(self):
        self.applicant_code = make_autoname("APP-.#####")

    def validate(self):
        is_new = self.is_new()
        previous = self.get_doc_before_save()
        request_changed = is_new or (previous and previous.recruitment_request != self.recruitment_request)
        if previous:
            self.applicant_code = previous.applicant_code or make_autoname("APP-.#####")

        if is_new and not self.applicant_status:
            self.applicant_status = "New"

        self.validate_recruitment_request(request_changed)
        self.validate_duplicate_application()
        self.validate_status(previous)
        self.validate_rejection_reason()
        self.validate_experience()
        self.validate_cv_attachment()
        if self.applicant_status not in ("New", "Rejected") and not self.cv_attachment:
            frappe.throw(_("Cần đính kèm CV trước khi tiếp tục xử lý hồ sơ."))

    def validate_cv_attachment(self):
        if self.cv_attachment and not self.cv_attachment.startswith("/private/files/"):
            frappe.throw(_("CV phải được tải lên hệ thống lưu trữ riêng tư."))

    def validate_recruitment_request(self, request_changed):
        if not self.recruitment_request:
            frappe.throw(_("Vui lòng chọn yêu cầu tuyển dụng."))

        request = frappe.get_doc("Recruitment Request", self.recruitment_request)
        if request_changed:
            if not self.is_new() and (
                frappe.db.exists("Interview", {"job_applicant": self.name})
                or frappe.db.exists("Job Offer", {"job_applicant": self.name})
            ):
                frappe.throw(_("Không thể đổi yêu cầu tuyển dụng sau khi đã phát sinh lịch phỏng vấn hoặc Job Offer."))
            if request.docstatus != 1 or request.workflow_state != "Approved":
                frappe.throw(_("Chỉ được tiếp nhận ứng viên từ yêu cầu tuyển dụng đã được phê duyệt."))
            if request.docstatus == 2:
                frappe.throw(_("Yêu cầu tuyển dụng đã đóng hoặc bị hủy."))

            hired_count = frappe.db.count(
                "Job Applicant",
                {"recruitment_request": self.recruitment_request, "applicant_status": "Hired"},
            )
            if self.is_new() and hired_count >= request.number_of_employees:
                frappe.throw(_("Yêu cầu tuyển dụng đã tuyển đủ số lượng."))

        self.position_title = request.position_title
        self.department = request.department_

    def validate_duplicate_application(self):
        if self.email:
            self.email = self.email.strip().lower()
        filters = {
            "recruitment_request": self.recruitment_request,
            "email": self.email,
        }
        if not self.is_new():
            filters["name"] = ["!=", self.name]
        if frappe.db.exists("Job Applicant", filters):
            frappe.throw(_("Ứng viên có email này đã ứng tuyển cho cùng yêu cầu tuyển dụng."))

    def validate_status(self, previous):
        if not self.applicant_status:
            frappe.throw(_("Vui lòng chọn trạng thái ứng viên."))
        if not previous:
            if self.is_new() and self.applicant_status != "New":
                frappe.throw(_("Hồ sơ ứng viên mới phải bắt đầu ở trạng thái New."))
            return
        if previous.applicant_status == self.applicant_status:
            return

        transitions = {
            "New": {"Screening", "Rejected"},
            "Screening": {"Interview Scheduled", "Rejected"},
            "Interview Scheduled": {"Interviewing", "Rejected"},
            "Interviewing": {"Passed", "Rejected"},
            "Passed": {"Offer Sent"},
            "Offer Sent": {"Offer Declined", "Hired"},
            "Rejected": set(),
            "Offer Declined": set(),
            "Hired": set(),
        }
        if self.applicant_status not in transitions.get(previous.applicant_status, set()):
            frappe.throw(
                _("Không thể chuyển trạng thái ứng viên từ {0} sang {1}.").format(
                    previous.applicant_status, self.applicant_status
                )
            )

        if self.applicant_status == "Passed":
            if "HR Manager" not in frappe.get_roles():
                frappe.throw(_("Chỉ HR Manager được xác nhận ứng viên đạt yêu cầu."))
            self.validate_all_mandatory_rounds_passed()
        elif self.applicant_status == "Interview Scheduled" and not frappe.db.exists(
            "Interview",
            {"job_applicant": self.name, "status": "Scheduled"},
        ):
            frappe.throw(_("Cần có lịch phỏng vấn trước khi chuyển trạng thái ứng viên."))
        elif self.applicant_status == "Interviewing" and not frappe.db.exists(
            "Interview",
            {"job_applicant": self.name, "status": "In Progress"},
        ):
            frappe.throw(_("Cần có buổi phỏng vấn đang diễn ra trước khi chuyển trạng thái ứng viên."))
        elif self.applicant_status in ("Offer Sent", "Offer Declined", "Hired"):
            expected_offer_status = {
                "Offer Sent": "Sent",
                "Offer Declined": "Declined",
                "Hired": "Accepted",
            }[self.applicant_status]
            if not frappe.db.exists(
                "Job Offer",
                {"job_applicant": self.name, "offer_status": expected_offer_status},
            ):
                frappe.throw(_("Trạng thái ứng viên phải được cập nhật từ Job Offer tương ứng."))

    def validate_all_mandatory_rounds_passed(self):
        rounds = frappe.get_all(
            "Interview Round",
            filters={"active": 1, "is_mandatory": 1},
            fields=["name"],
        )
        for interview_round in rounds:
            if not frappe.db.exists(
                "Interview",
                {
                    "job_applicant": self.name,
                    "interview_round": interview_round.name,
                    "status": "Completed",
                    "result": "Passed",
                },
            ):
                frappe.throw(_("Chưa hoàn thành và đạt tất cả các vòng phỏng vấn bắt buộc."))

    def validate_rejection_reason(self):
        if self.applicant_status == "Rejected" and not (self.rejection_reason or "").strip():
            frappe.throw(_("Bắt buộc nhập lý do từ chối ứng viên."))

    def validate_experience(self):
        if self.years_of_experience is not None and self.years_of_experience < 0:
            frappe.throw(_("Số năm kinh nghiệm không được nhỏ hơn 0."))

    def on_update(self):
        previous = self.get_doc_before_save()
        if self.applicant_status != "Hired" and not (
            previous and previous.applicant_status == "Hired"
        ):
            return

        request = frappe.get_doc("Recruitment Request", self.recruitment_request)
        hired_count = frappe.db.count(
            "Job Applicant",
            {"recruitment_request": self.recruitment_request, "applicant_status": "Hired"},
        )
        frappe.db.set_value(
            "Recruitment Request",
            self.recruitment_request,
            {
                "hired_employee_count": hired_count,
                "is_fulfilled": hired_count >= request.number_of_employees,
            },
        )

    def on_trash(self):
        if frappe.db.exists("Interview", {"job_applicant": self.name}) or frappe.db.exists(
            "Job Offer", {"job_applicant": self.name}
        ):
            frappe.throw(_("Không thể xóa ứng viên đã có lịch phỏng vấn hoặc Job Offer; hãy giữ hồ sơ để bảo toàn lịch sử."))
