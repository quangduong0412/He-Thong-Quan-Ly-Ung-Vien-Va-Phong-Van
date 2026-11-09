# Copyright (c) 2026, Duong Nguyen and Contributors
# See license.txt

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, today


class TestRecruitmentRequest(FrappeTestCase):
    def make_request(self):
        doc = frappe.get_doc(
            {
                "doctype": "Recruitment Request",
                "request_title": "Test Recruitment Request",
                "request_date": today(),
                "position_title": "Test Position",
                "number_of_employees": 1,
                "expected_start_date": add_days(today(), 1),
                "employment_type": "Full-time",
                "priority": "Normal",
                "reason": "Automated test",
                "job_description": "Automated test job description",
            }
        )
        doc.append(
            "table_rvqn",
            {
                "criterion_name": "Experience",
                "weight": 100,
                "is_mandatory": 1,
                "evaluation_method": "CV Review",
            },
        )
        return doc

    def validate_request(self, doc, **settings_overrides):
        settings = frappe._dict(
            maximum_requested_employees=0,
            require_salary_range=0,
            allow_urgent_recruitment=1,
        )
        settings.update(settings_overrides)
        with patch("frappe.get_single", return_value=settings):
            doc.run_method("validate")

    def assert_invalid_request(self, doc, expected_message):
        with self.assertRaisesRegex(frappe.ValidationError, expected_message):
            self.validate_request(doc)

    def test_valid_request_defaults_requester(self):
        doc = self.make_request()

        self.validate_request(doc)

        self.assertEqual(doc.requester_, frappe.session.user)

    def test_number_of_employees_must_be_positive(self):
        doc = self.make_request()
        doc.number_of_employees = 0

        self.assert_invalid_request(doc, "Số lượng nhân sự phải lớn hơn 0")

    def test_request_cannot_exceed_configured_employee_limit(self):
        doc = self.make_request()
        doc.number_of_employees = 3

        with self.assertRaisesRegex(frappe.ValidationError, "không được vượt quá 2"):
            self.validate_request(doc, maximum_requested_employees=2)

    def test_expected_start_date_must_be_after_request_date(self):
        doc = self.make_request()
        doc.expected_start_date = doc.request_date

        self.assert_invalid_request(doc, "Ngày dự kiến nhận việc phải lớn hơn ngày tạo yêu cầu")

    def test_maximum_salary_cannot_be_less_than_minimum_salary(self):
        doc = self.make_request()
        doc.minimum_salary = 1000
        doc.maximum_salary = 900

        self.assert_invalid_request(doc, "Mức lương tối đa phải lớn hơn hoặc bằng mức lương tối thiểu")

    def test_salary_range_can_be_required_by_settings(self):
        doc = self.make_request()

        with self.assertRaisesRegex(frappe.ValidationError, "Bắt buộc nhập cả mức lương tối thiểu và tối đa"):
            self.validate_request(doc, require_salary_range=1)

    def test_urgent_priority_can_be_disabled_by_settings(self):
        doc = self.make_request()
        doc.priority = "Urgent"

        with self.assertRaisesRegex(frappe.ValidationError, "chưa cho phép tạo yêu cầu tuyển gấp"):
            self.validate_request(doc, allow_urgent_recruitment=0)

    def test_request_requires_at_least_one_criterion(self):
        doc = self.make_request()
        doc.set("table_rvqn", [])

        self.assert_invalid_request(doc, "Phải có ít nhất một tiêu chí tuyển dụng")

    def test_criterion_names_must_be_unique(self):
        doc = self.make_request()
        doc.append(
            "table_rvqn",
            {
                "criterion_name": "Experience",
                "weight": 0,
                "is_mandatory": 0,
                "evaluation_method": "Interview",
            },
        )

        self.assert_invalid_request(doc, "Tiêu chí 'Experience' bị trùng lặp")

    def test_criterion_weight_must_be_positive(self):
        doc = self.make_request()
        doc.table_rvqn[0].weight = 0

        self.assert_invalid_request(doc, "Trọng số của 'Experience' phải lớn hơn 0")

    def test_criterion_weights_must_total_100(self):
        doc = self.make_request()
        doc.table_rvqn[0].weight = 90

        self.assert_invalid_request(doc, "Tổng trọng số các tiêu chí phải bằng 100%")

    def test_at_least_one_criterion_must_be_mandatory(self):
        doc = self.make_request()
        doc.table_rvqn[0].is_mandatory = 0

        self.assert_invalid_request(doc, "Phải có ít nhất một tiêu chí bắt buộc")

    def test_rejection_requires_reason_when_state_changes(self):
        doc = self.make_request()
        doc.workflow_state = "Rejected"
        doc._doc_before_save = frappe._dict(workflow_state="Pending HR Review")

        self.assert_invalid_request(doc, "Bắt buộc nhập lý do từ chối")

    def test_rejection_with_reason_is_valid(self):
        doc = self.make_request()
        doc.workflow_state = "Rejected"
        doc.rejection_reason = "Position is not approved"
        doc._doc_before_save = frappe._dict(workflow_state="Pending HR Review")

        self.validate_request(doc)

    def test_revision_requires_note_when_state_changes(self):
        doc = self.make_request()
        doc.owner = frappe.session.user
        doc.workflow_state = "Revision Required"
        doc._doc_before_save = frappe._dict(workflow_state="Pending HR Review")

        self.assert_invalid_request(doc, "Bắt buộc nhập nội dung cần chỉnh sửa")

    def test_revision_with_note_is_valid(self):
        doc = self.make_request()
        doc.owner = frappe.session.user
        doc.workflow_state = "Revision Required"
        doc.revision_note = "Please update the salary range"
        doc._doc_before_save = frappe._dict(workflow_state="Pending HR Review")

        self.validate_request(doc)
