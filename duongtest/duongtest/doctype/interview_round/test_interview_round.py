# Copyright (c) 2026, Duong Nguyen and Contributors
# See license.txt

from types import SimpleNamespace

import frappe
from frappe.tests.utils import FrappeTestCase

from duongtest.duongtest.doctype.interview_round.interview_round import InterviewRound


class TestInterviewRound(FrappeTestCase):
    def test_sequence_must_be_positive(self):
        interview_round = SimpleNamespace(sequence=0, minimum_passing_score=50)

        with self.assertRaises(frappe.ValidationError):
            InterviewRound.validate(interview_round)

    def test_minimum_score_must_be_within_percent_range(self):
        interview_round = SimpleNamespace(sequence=1, minimum_passing_score=101)

        with self.assertRaises(frappe.ValidationError):
            InterviewRound.validate(interview_round)
