# Copyright (c) 2026, Duong Nguyen and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class InterviewFeedbackCriterion(Document):
    def validate(self):
        if self.maximum_score is None or self.maximum_score <= 0:
            frappe.throw(_("Điểm tối đa phải lớn hơn 0."))
        if self.score is None or self.score < 0 or self.score > self.maximum_score:
            frappe.throw(_("Điểm phải nằm trong khoảng từ 0 đến điểm tối đa."))
