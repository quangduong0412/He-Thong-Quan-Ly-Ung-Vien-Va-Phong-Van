# Copyright (c) 2026, Duong Nguyen and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class InterviewRound(Document):
    def validate(self):
        if not self.sequence or self.sequence <= 0:
            frappe.throw(_("Thứ tự vòng phỏng vấn phải lớn hơn 0."))
        if self.minimum_passing_score is None or not 0 <= self.minimum_passing_score <= 100:
            frappe.throw(_("Điểm đạt tối thiểu phải nằm trong khoảng từ 0 đến 100."))

        filters = {"sequence": self.sequence}
        if not self.is_new():
            filters["name"] = ["!=", self.name]
        if frappe.db.exists("Interview Round", filters):
            frappe.throw(_("Thứ tự vòng phỏng vấn không được trùng lặp."))

    def on_trash(self):
        if frappe.db.exists("Interview", {"interview_round": self.name}):
            frappe.throw(_("Không thể xóa vòng phỏng vấn đã được sử dụng; hãy chuyển sang không hoạt động."))
