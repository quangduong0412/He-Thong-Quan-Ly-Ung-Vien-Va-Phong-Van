from types import SimpleNamespace
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from duongtest.duongtest.doctype.job_applicant.job_applicant import JobApplicant
from duongtest.permissions import (
    can_access_cv_file,
    get_interview_feedback_permission_query,
    has_sensitive_record_permission,
)


class TestSensitiveRecordPermissions(FrappeTestCase):
    @patch("duongtest.permissions.is_assigned_interviewer", return_value=True)
    @patch("duongtest.permissions.frappe.get_roles", return_value=["Interviewer"])
    def test_interviewer_can_read_own_feedback(self, _get_roles, _is_assigned):
        feedback = SimpleNamespace(
            doctype="Interview Feedback",
            interviewer="interviewer@example.com",
            interview_="INTERVIEW-001",
        )

        self.assertTrue(
            has_sensitive_record_permission(
                feedback,
                ptype="read",
                user="interviewer@example.com",
            )
        )

    @patch("duongtest.permissions.frappe.get_roles", return_value=["Interviewer"])
    def test_interviewer_cannot_read_another_interviewers_feedback(self, _get_roles):
        feedback = SimpleNamespace(
            doctype="Interview Feedback",
            interviewer="other@example.com",
            interview_="INTERVIEW-001",
        )

        self.assertFalse(
            has_sensitive_record_permission(
                feedback,
                ptype="read",
                user="interviewer@example.com",
            )
        )

    @patch("duongtest.permissions.can_modify_cv_file", return_value=False)
    @patch("duongtest.permissions.frappe.get_roles", return_value=["Interviewer"])
    def test_interviewer_cannot_modify_cv_file(self, _get_roles, _can_modify):
        file_doc = SimpleNamespace(
            doctype="File",
            attached_to_doctype="Job Applicant",
            attached_to_field="cv_attachment",
            attached_to_name="APP-00001",
        )

        self.assertFalse(
            has_sensitive_record_permission(
                file_doc,
                ptype="write",
                user="interviewer@example.com",
            )
        )

    @patch("duongtest.permissions.frappe.get_roles", return_value=["Interviewer"])
    def test_feedback_list_query_is_limited_to_current_interviewer(self, _get_roles):
        condition = get_interview_feedback_permission_query("interviewer@example.com")

        self.assertIn("interviewer", condition)
        self.assertIn("interview_", condition)
        self.assertIn("interviewer@example.com", condition)

    @patch("duongtest.permissions.frappe.has_permission", return_value=False)
    @patch("duongtest.permissions.frappe.get_doc")
    def test_cv_download_requires_applicant_read_permission(self, get_doc, has_permission):
        file_doc = SimpleNamespace(
            attached_to_doctype="Job Applicant",
            attached_to_field="cv_attachment",
            attached_to_name="APP-00001",
            file_url="/private/files/cv.pdf",
            is_private=1,
        )
        get_doc.return_value = SimpleNamespace(cv_attachment=file_doc.file_url)

        self.assertFalse(can_access_cv_file(file_doc, user="interviewer@example.com"))
        has_permission.assert_called_once_with(
            "Job Applicant",
            "read",
            doc=get_doc.return_value,
            user="interviewer@example.com",
        )

    def test_public_cv_url_is_rejected(self):
        applicant = SimpleNamespace(cv_attachment="/files/cv.pdf")

        with self.assertRaises(frappe.ValidationError):
            JobApplicant.validate_cv_attachment(applicant)
