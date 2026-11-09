# Copyright (c) 2026, Duong Nguyen and Contributors
# See license.txt

from types import SimpleNamespace

import frappe
from frappe.tests.utils import FrappeTestCase

from duongtest.duongtest.doctype.interview_feedback.interview_feedback import (
    InterviewFeedback,
)


class TestInterviewFeedback(FrappeTestCase):
    def test_score_cannot_exceed_maximum(self):
        feedback = SimpleNamespace(
            feedback_details=[
                SimpleNamespace(
                    criterion="Technical skills",
                    maximum_score=5,
                    score=6,
                )
            ]
        )

        with self.assertRaises(frappe.ValidationError):
            InterviewFeedback.validate_feedback_details(feedback)

    def test_score_cannot_be_negative(self):
        feedback = SimpleNamespace(
            feedback_details=[
                SimpleNamespace(
                    criterion="Technical skills",
                    maximum_score=5,
                    score=-1,
                )
            ]
        )

        with self.assertRaises(frappe.ValidationError):
            InterviewFeedback.validate_feedback_details(feedback)
