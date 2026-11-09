# Copyright (c) 2026, Duong Nguyen and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class RecruitmentCriterion(Document):
    def validate(self):
        if not (self.criterion_name or "").strip():
            frappe.throw(_("Tên tiêu chí tuyển dụng không được để trống."))
        if self.weight is None or not 0 < self.weight <= 100:
            frappe.throw(_("Trọng số phải lớn hơn 0 và nhỏ hơn hoặc bằng 100."))
