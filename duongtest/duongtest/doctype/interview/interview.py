# Copyright (c) 2026, Duong Nguyen and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_datetime, now_datetime


class Interview(Document):
    def validate(self):
        previous = self.get_doc_before_save()
        self.validate_applicant_and_round(previous)
        self.validate_times(previous)
        self.validate_interviewers()
        self.update_feedback_submitted_flags()
        self.validate_method_details()
        if self.status in ("Scheduled", "In Progress", "Completed"):
            self.validate_round_order()
        self.validate_schedule_conflicts()
        self.validate_status_transition(previous)
        if self.status == "Completed":
            self.calculate_result()
        else:
            self.total_score = 0
            self.result = "Pending"

    def validate_applicant_and_round(self, previous):
        applicant = frappe.get_doc("Job Applicant", self.job_applicant)
        active_status = self.status in ("Scheduled", "In Progress")
        creating_or_rescheduling = (
            not previous
            or previous.job_applicant != self.job_applicant
            or (active_status and previous.status != self.status)
        )
        if creating_or_rescheduling and applicant.applicant_status not in (
            "Screening", "Interview Scheduled", "Interviewing"
        ):
            frappe.throw(_("Ứng viên chưa ở trạng thái phù hợp để phỏng vấn."))

        interview_round = frappe.get_doc("Interview Round", self.interview_round)
        round_must_be_active = (
            not previous
            or previous.interview_round != self.interview_round
            or (active_status and previous.status != self.status)
        )
        if round_must_be_active and not interview_round.active:
            frappe.throw(_("Không thể sử dụng vòng phỏng vấn đã ngừng hoạt động."))
        self._round = interview_round

    def validate_times(self, previous):
        if get_datetime(self.end_time) <= get_datetime(self.start_time):
            frappe.throw(_("Thời gian kết thúc phải sau thời gian bắt đầu."))
        start_changed = not previous or previous.start_time != self.start_time
        if self.status == "Scheduled" and start_changed and get_datetime(self.start_time) < now_datetime():
            frappe.throw(_("Không thể xếp lịch phỏng vấn trong quá khứ."))

    def validate_interviewers(self):
        interviewers = [row.interviewer for row in self.interviewers]
        if not interviewers:
            frappe.throw(_("Phỏng vấn phải có ít nhất một người phỏng vấn."))
        if len(interviewers) != len(set(interviewers)):
            frappe.throw(_("Không được phân công trùng người phỏng vấn."))
        if sum(bool(row.is_lead_interviewer) for row in self.interviewers) != 1:
            frappe.throw(_("Phải có đúng một người phỏng vấn chính."))

    def update_feedback_submitted_flags(self):
        submitted_interviewers = set()
        if not self.is_new():
            submitted_interviewers = {
                feedback.interviewer
                for feedback in frappe.get_all(
                    "Interview Feedback",
                    filters={"interview_": self.name, "is_submitted": 1},
                    fields=["interviewer"],
                )
            }
        for row in self.interviewers:
            row.feedback_submitted = row.interviewer in submitted_interviewers

    def validate_method_details(self):
        if self.interview_method == "Online" and not (self.meeting_url or "").strip():
            frappe.throw(_("Phỏng vấn trực tuyến bắt buộc có Meeting URL."))
        if self.interview_method == "Onsite" and not (self.location or "").strip():
            frappe.throw(_("Phỏng vấn trực tiếp bắt buộc có địa điểm."))

    def validate_round_order(self):
        required_rounds = frappe.get_all(
            "Interview Round",
            filters={
                "active": 1,
                "is_mandatory": 1,
                "sequence": ["<", self._round.sequence],
            },
            fields=["name"],
        )
        for required_round in required_rounds:
            if not frappe.db.exists(
                "Interview",
                {
                    "job_applicant": self.job_applicant,
                    "interview_round": required_round.name,
                    "status": "Completed",
                    "result": "Passed",
                },
            ):
                frappe.throw(_("Không thể bỏ qua vòng phỏng vấn bắt buộc trước đó."))

    def validate_schedule_conflicts(self):
        active_statuses = ("Scheduled", "In Progress")
        filters = {
            "job_applicant": self.job_applicant,
            "status": ["in", active_statuses],
            "start_time": ["<", self.end_time],
            "end_time": [">", self.start_time],
        }
        if not self.is_new():
            filters["name"] = ["!=", self.name]
        if frappe.db.exists("Interview", filters):
            frappe.throw(_("Ứng viên đã có lịch phỏng vấn bị trùng thời gian."))

        interviewers = [row.interviewer for row in self.interviewers]
        placeholders = ", ".join(["%s"] * len(interviewers))
        query = """
            SELECT i.name
            FROM `tabInterview` i
            INNER JOIN `tabInterviewer Assignment` ia
                ON ia.parent = i.name
                AND ia.parenttype = 'Interview'
                AND ia.parentfield = 'interviewers'
            WHERE i.status IN ('Scheduled', 'In Progress')
                AND i.start_time < %s
                AND i.end_time > %s
                AND ia.interviewer IN ({})
                AND i.name != %s
            LIMIT 1
        """.format(placeholders)
        values = [self.end_time, self.start_time, *interviewers, self.name or ""]
        if frappe.db.sql(query, values):
            frappe.throw(_("Người phỏng vấn đã có lịch bị trùng thời gian."))

    def validate_status_transition(self, previous):
        if not previous:
            if self.is_new() and self.status != "Scheduled":
                frappe.throw(_("Buổi phỏng vấn mới phải bắt đầu ở trạng thái Scheduled."))
            return
        if previous.status == self.status:
            return
        transitions = {
            "Scheduled": {"In Progress", "Completed", "Cancelled", "No Show"},
            "In Progress": {"Completed", "Cancelled", "No Show"},
            "Completed": set(),
            "Cancelled": set(),
            "No Show": set(),
        }
        if self.status not in transitions.get(previous.status, set()):
            frappe.throw(_("Không thể chuyển trạng thái buổi phỏng vấn từ {0} sang {1}.").format(
                previous.status, self.status
            ))

    def calculate_result(self):
        feedbacks = frappe.get_all(
            "Interview Feedback",
            filters={"interview_": self.name, "is_submitted": 1},
            fields=["name", "interviewer"],
        )
        submitted_interviewers = {feedback.interviewer for feedback in feedbacks}
        assigned_interviewers = {row.interviewer for row in self.interviewers}
        if submitted_interviewers != assigned_interviewers:
            frappe.throw(_("Chỉ hoàn tất phỏng vấn khi tất cả người phỏng vấn đã gửi feedback."))

        percentages = []
        for feedback in feedbacks:
            doc = frappe.get_doc("Interview Feedback", feedback.name)
            maximum_score = sum(row.maximum_score for row in doc.feedback_details)
            if maximum_score <= 0:
                frappe.throw(_("Tổng điểm tối đa của feedback phải lớn hơn 0."))
            percentages.append(doc.total_score / maximum_score * 100)

        self.total_score = round(sum(percentages) / len(percentages), 2)
        self.result = (
            "Passed" if self.total_score >= self._round.minimum_passing_score else "Failed"
        )

    def on_update(self):
        applicant = frappe.get_doc("Job Applicant", self.job_applicant)
        applicant_status = applicant.applicant_status
        new_status = None
        if self.status == "Scheduled" and applicant_status == "Screening":
            new_status = "Interview Scheduled"
        elif self.status == "In Progress" and applicant_status == "Interview Scheduled":
            new_status = "Interviewing"
        if new_status:
            applicant.applicant_status = new_status
            applicant.save(ignore_permissions=True)

    def on_trash(self):
        if frappe.db.exists("Interview Feedback", {"interview_": self.name}):
            frappe.throw(_("Không thể xóa buổi phỏng vấn đã có feedback; hãy giữ lại lịch sử đánh giá."))
