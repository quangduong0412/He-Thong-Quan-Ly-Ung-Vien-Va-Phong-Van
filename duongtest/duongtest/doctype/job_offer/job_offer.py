# Copyright (c) 2026, Duong Nguyen and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, now_datetime, today


class JobOffer(Document):
    def validate(self):
        previous = self.get_doc_before_save()
        if self.is_new() and not self.offer_status:
            self.offer_status = "Draft"

        self.validate_applicant()
        self.copy_applicant_details()
        self.validate_dates(previous)
        self.validate_active_offer()
        self.validate_status_transition(previous)
        self.validate_decline_reason()

    def validate_applicant(self):
        if not self.job_applicant:
            frappe.throw(_("Vui lòng chọn ứng viên."))
        applicant = frappe.get_doc("Job Applicant", self.job_applicant)
        expected_statuses = {
            "Draft": {"Passed"},
            "Pending Approval": {"Passed"},
            "Approved": {"Passed"},
            "Sent": {"Passed", "Offer Sent"},
            "Accepted": {"Offer Sent", "Hired"},
            "Declined": {"Offer Sent", "Offer Declined"},
            "Expired": {"Offer Sent"},
            "Cancelled": {"Passed"},
        }
        if applicant.applicant_status not in expected_statuses.get(self.offer_status, set()):
            frappe.throw(_("Chỉ được tạo hoặc xử lý Job Offer cho ứng viên đã vượt qua quy trình."))
        self._applicant = applicant

    def copy_applicant_details(self):
        self.recruitment_request = self._applicant.recruitment_request
        self.position_itle = self._applicant.position_title
        self.department = self._applicant.department

    def validate_dates(self, previous):
        self.sent_at = previous.sent_at if previous else None
        self.accepted_at = previous.accepted_at if previous else None
        if self.proposed_start_date and getdate(self.proposed_start_date) <= getdate(today()):
            frappe.throw(_("Ngày bắt đầu dự kiến phải sau ngày hiện tại."))

        entering_sent = self.offer_status == "Sent" and (
            not previous or previous.offer_status != "Sent"
        )
        if entering_sent:
            self.sent_at = now_datetime()
        if self.offer_status == "Sent":
            sent_date = getdate(self.sent_at or today())
            if not self.response_deadline or getdate(self.response_deadline) <= sent_date:
                frappe.throw(_("Hạn phản hồi phải sau ngày gửi offer."))

    def validate_active_offer(self):
        active_statuses = ("Draft", "Pending Approval", "Approved", "Sent", "Accepted")
        if self.offer_status not in active_statuses:
            return

        filters = {
            "job_applicant": self.job_applicant,
            "offer_status": ["in", active_statuses],
        }
        if not self.is_new():
            filters["name"] = ["!=", self.name]
        if frappe.db.exists("Job Offer", filters):
            frappe.throw(_("Ứng viên đã có một Job Offer còn hiệu lực."))

    def validate_status_transition(self, previous):
        if not previous:
            if self.offer_status != "Draft":
                frappe.throw(_("Job Offer mới phải bắt đầu ở trạng thái Draft."))
            return
        if previous.offer_status == self.offer_status:
            return

        transitions = {
            "Draft": {"Pending Approval", "Cancelled"},
            "Pending Approval": {"Draft", "Approved", "Cancelled"},
            "Approved": {"Sent", "Cancelled"},
            "Sent": {"Accepted", "Declined", "Expired"},
            "Accepted": set(),
            "Declined": set(),
            "Expired": set(),
            "Cancelled": set(),
        }
        if self.offer_status not in transitions.get(previous.offer_status, set()):
            frappe.throw(
                _("Không thể chuyển trạng thái Job Offer từ {0} sang {1}.").format(
                    previous.offer_status, self.offer_status
                )
            )
        if self.offer_status == "Sent" and previous.offer_status != "Approved":
            frappe.throw(_("Chỉ Job Offer đã được phê duyệt mới được gửi."))
        if self.offer_status in ("Accepted", "Declined") and previous.offer_status != "Sent":
            frappe.throw(_("Chỉ Job Offer đã gửi mới được chấp nhận hoặc từ chối."))
        if self.offer_status == "Accepted":
            self.accepted_at = previous.accepted_at or now_datetime()

    def validate_decline_reason(self):
        if self.offer_status == "Declined" and not (self.decline_reason or "").strip():
            frappe.throw(_("Bắt buộc nhập lý do từ chối Job Offer."))

    def on_update(self):
        applicant_status = {
            "Sent": "Offer Sent",
            "Declined": "Offer Declined",
            "Accepted": "Hired",
        }.get(self.offer_status)
        if applicant_status:
            applicant = frappe.get_doc("Job Applicant", self.job_applicant)
            if applicant.applicant_status != applicant_status:
                applicant.applicant_status = applicant_status
                applicant.save(ignore_permissions=True)

    def on_trash(self):
        if self.offer_status != "Draft":
            frappe.throw(_("Chỉ được xóa Job Offer ở trạng thái Draft; các trạng thái khác cần lưu lịch sử."))
