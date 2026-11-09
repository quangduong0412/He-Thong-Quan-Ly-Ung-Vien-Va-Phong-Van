import frappe
from frappe.model.document import Document
from frappe import _

class RecruitmentCategory(Document):
    def validate(self):
        super().validate()

        if self.category_name:
            has_duplicate = frappe.db.exists("Recruitment Category", {
                "category_name": self.category_name,
                "parent_recruitment_category": self.parent_recruitment_category or "",
                "name": ["!=", self.name]
            })
            frappe.throw("Tên danh mục đã tồn tại")