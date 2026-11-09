# Copyright (c) 2026, Duong Nguyen and Contributors
# See license.txt

from datetime import timedelta
from types import SimpleNamespace

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import now_datetime

from duongtest.duongtest.doctype.interview.interview import Interview


class TestInterview(FrappeTestCase):
    def test_interview_requires_exactly_one_lead(self):
        interview = SimpleNamespace(
            interviewers=[
                SimpleNamespace(interviewer="one@example.com", is_lead_interviewer=1),
                SimpleNamespace(interviewer="two@example.com", is_lead_interviewer=1),
            ]
        )

        with self.assertRaises(frappe.ValidationError):
            Interview.validate_interviewers(interview)

    def test_interview_rejects_duplicate_interviewers(self):
        interview = SimpleNamespace(
            interviewers=[
                SimpleNamespace(interviewer="one@example.com", is_lead_interviewer=1),
                SimpleNamespace(interviewer="one@example.com", is_lead_interviewer=0),
            ]
        )

        with self.assertRaises(frappe.ValidationError):
            Interview.validate_interviewers(interview)

    def test_end_time_must_follow_start_time(self):
        start = now_datetime() + timedelta(days=1)
        interview = SimpleNamespace(status="Scheduled", start_time=start, end_time=start)

        with self.assertRaises(frappe.ValidationError):
            Interview.validate_times(interview, None)

    def test_scheduled_interview_cannot_start_in_past(self):
        start = now_datetime() - timedelta(minutes=5)
        interview = SimpleNamespace(
            status="Scheduled",
            start_time=start,
            end_time=start + timedelta(minutes=30),
        )

        with self.assertRaises(frappe.ValidationError):
            Interview.validate_times(interview, None)
