# Copyright (c) 2026, Duong Nguyen and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class InterviewFeedback(Document):
    def validate(self):
        previous = self.get_doc_before_save()
        if previous and previous.is_submitted:
            frappe.throw(_("Feedback đã gửi không được chỉnh sửa."))
        if self.is_submitted and not self.flags.get("allow_feedback_submit"):
            frappe.throw(_("Chỉ được gửi feedback bằng thao tác Submit Feedback."))
        if self.flags.get("allow_feedback_submit"):
            self.submitted_at = now_datetime()
        else:
            self.is_submitted = previous.is_submitted if previous else 0
            self.submitted_at = (
                (previous.submitted_at or previous.get("thời_điểm_gửi")) if previous else None
            )
        self.set("thời_điểm_gửi", self.submitted_at)

        self.validate_interviewer()
        self.validate_feedback_details()
        self.total_score = sum(row.score for row in self.feedback_details)

    def validate_interviewer(self):
        if not self.interview_:
            frappe.throw(_("Vui lòng chọn buổi phỏng vấn."))

        interview = frappe.get_doc("Interview", self.interview_)
        if interview.status != "In Progress":
            frappe.throw(_("Chỉ được gửi feedback khi buổi phỏng vấn đang diễn ra."))
        assigned_interviewers = {row.interviewer for row in interview.interviewers}
        current_user = frappe.session.user
        if current_user not in assigned_interviewers:
            frappe.throw(_("Chỉ người được phân công mới được nhập feedback."))

        if self.interviewer and self.interviewer != current_user:
            frappe.throw(_("Bạn chỉ được nhập feedback bằng tài khoản của mình."))
        self.interviewer = current_user
        self.job_applicant = interview.job_applicant

        filters = {"interview_": self.interview_, "interviewer": current_user}
        if not self.is_new():
            filters["name"] = ["!=", self.name]
        if frappe.db.exists("Interview Feedback", filters):
            frappe.throw(_("Mỗi người chỉ được tạo một feedback cho một buổi phỏng vấn."))

    def validate_feedback_details(self):
        if not self.feedback_details:
            frappe.throw(_("Feedback phải có ít nhất một tiêu chí đánh giá."))

        criteria = set()
        for row in self.feedback_details:
            criterion = (row.criterion or "").strip().casefold()
            if not criterion:
                frappe.throw(_("Tên tiêu chí đánh giá không được để trống."))
            if criterion in criteria:
                frappe.throw(_("Không được lặp tiêu chí đánh giá trong cùng feedback."))
            criteria.add(criterion)
            if row.maximum_score is None or row.maximum_score <= 0:
                frappe.throw(_("Điểm tối đa của mỗi tiêu chí phải lớn hơn 0."))
            if row.score is None or row.score < 0 or row.score > row.maximum_score:
                frappe.throw(_("Điểm đánh giá phải nằm trong khoảng từ 0 đến điểm tối đa."))

    @frappe.whitelist()
    def submit_feedback(self):
        self.check_permission("write")
        if self.is_submitted:
            frappe.throw(_("Feedback này đã được gửi."))
        interview = frappe.get_doc("Interview", self.interview_)
        if interview.status != "In Progress":
            frappe.throw(_("Chỉ được gửi feedback khi buổi phỏng vấn đang diễn ra."))
        if self.interviewer and self.interviewer != frappe.session.user:
            frappe.throw(_("Bạn chỉ được gửi feedback bằng tài khoản của mình."))

        self.is_submitted = 1
        self.flags.allow_feedback_submit = True
        self.save()

        for row in interview.interviewers:
            if row.interviewer == self.interviewer:
                row.feedback_submitted = 1
                break
        interview.save(ignore_permissions=True)

        return self.name

    def on_trash(self):
        if self.is_submitted:
            frappe.throw(_("Không thể xóa feedback đã gửi; hãy giữ lại lịch sử đánh giá."))
