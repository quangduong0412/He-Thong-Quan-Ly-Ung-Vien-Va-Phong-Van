# Copyright (c) 2026, Duong Nguyen and Contributors
# See license.txt

from types import SimpleNamespace

import frappe
from frappe.tests.utils import FrappeTestCase

from duongtest.duongtest.doctype.job_offer.job_offer import JobOffer


class TestJobOffer(FrappeTestCase):
    def test_acceptance_requires_sent_offer(self):
        offer = SimpleNamespace(offer_status="Accepted")
        previous = SimpleNamespace(offer_status="Approved")

        with self.assertRaises(frappe.ValidationError):
            JobOffer.validate_status_transition(offer, previous)

    def test_declined_offer_requires_reason(self):
        offer = SimpleNamespace(offer_status="Declined", decline_reason=" ")

        with self.assertRaises(frappe.ValidationError):
            JobOffer.validate_decline_reason(offer)

    def test_new_offer_must_start_as_draft(self):
        offer = SimpleNamespace(offer_status="Sent")

        with self.assertRaises(frappe.ValidationError):
            JobOffer.validate_status_transition(offer, None)
