# Copyright (c) 2026, Duong Nguyen and Contributors
# See license.txt

from types import SimpleNamespace
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from duongtest.duongtest.doctype.job_applicant.job_applicant import JobApplicant


class TestJobApplicant(FrappeTestCase):
    def make_applicant(self):
        return SimpleNamespace(
            recruitment_request="REQ-001",
            is_new=lambda: True,
            position_title=None,
            department=None,
        )

    def make_request(self, workflow_state="Approved"):
        return SimpleNamespace(
            docstatus=1,
            workflow_state=workflow_state,
            number_of_employees=2,
            position_title="Engineer",
            department_="Engineering",
        )

    def test_approved_request_copies_position_and_department(self):
        applicant = self.make_applicant()

        with (
            patch("frappe.get_doc", return_value=self.make_request()),
            patch.object(frappe.db, "count", return_value=0),
        ):
            JobApplicant.validate_recruitment_request(applicant, True)

        self.assertEqual(applicant.position_title, "Engineer")
        self.assertEqual(applicant.department, "Engineering")

    def test_unapproved_request_is_rejected(self):
        applicant = self.make_applicant()

        with (
            patch("frappe.get_doc", return_value=self.make_request("Pending HR Review")),
            self.assertRaises(frappe.ValidationError),
        ):
            JobApplicant.validate_recruitment_request(applicant, True)

    def test_request_at_hiring_capacity_rejects_new_applicant(self):
        applicant = self.make_applicant()

        with (
            patch("frappe.get_doc", return_value=self.make_request()),
            patch.object(frappe.db, "count", return_value=2),
            self.assertRaises(frappe.ValidationError),
        ):
            JobApplicant.validate_recruitment_request(applicant, True)

    def test_duplicate_email_is_rejected_case_insensitively(self):
        applicant = SimpleNamespace(
            email=" Candidate@Example.com ",
            recruitment_request="REQ-001",
            is_new=lambda: True,
        )

        with (
            patch.object(frappe.db, "exists", return_value=True),
            self.assertRaises(frappe.ValidationError),
        ):
            JobApplicant.validate_duplicate_application(applicant)

        self.assertEqual(applicant.email, "candidate@example.com")
