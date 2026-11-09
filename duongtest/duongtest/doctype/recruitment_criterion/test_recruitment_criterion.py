# Copyright (c) 2026, Duong Nguyen and Contributors
# See license.txt

from types import SimpleNamespace

import frappe
from frappe.tests.utils import FrappeTestCase

from duongtest.duongtest.doctype.recruitment_criterion.recruitment_criterion import (
    RecruitmentCriterion,
)


class TestRecruitmentCriterion(FrappeTestCase):
    def test_criterion_name_cannot_be_blank(self):
        criterion = SimpleNamespace(criterion_name=" ", weight=50)

        with self.assertRaises(frappe.ValidationError):
            RecruitmentCriterion.validate(criterion)

    def test_weight_must_not_exceed_100(self):
        criterion = SimpleNamespace(criterion_name="Experience", weight=100.1)

        with self.assertRaises(frappe.ValidationError):
            RecruitmentCriterion.validate(criterion)
