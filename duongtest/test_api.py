import base64
import json
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase
from pypdf import PdfReader, PdfWriter

from duongtest.api import (
    ExternalAPIError,
    MAX_CV_SIZE,
    PUBLIC_STATUS_MESSAGES,
    _decode_cv,
    _integration_authorized,
    _idempotency_hash,
    _otp_digest,
    _read_uploaded_cv,
    _require_number,
    _verification_cache_key,
    get_application_status,
    request_status_code,
)


class TestExternalRecruitmentAPI(FrappeTestCase):
    @staticmethod
    def make_pdf():
        writer = PdfWriter()
        writer.add_blank_page(width=612, height=792)
        output = BytesIO()
        writer.write(output)
        return output.getvalue()

    def test_accepts_valid_pdf_cv_as_base64(self):
        content = self.make_pdf()
        filename, decoded = _decode_cv("resume.pdf", base64.b64encode(content).decode())

        self.assertEqual(filename, "resume.pdf")
        self.assertEqual(decoded, content)

    def test_accepts_valid_pdf_cv_as_uploaded_file(self):
        uploaded_file = SimpleNamespace(filename="resume.pdf", stream=BytesIO(self.make_pdf()))

        filename, content = _read_uploaded_cv(uploaded_file)

        self.assertEqual(filename, "resume.pdf")
        self.assertEqual(len(PdfReader(BytesIO(content)).pages), 1)

    def test_rejects_malformed_pdf_with_valid_signature(self):
        content = base64.b64encode(b"%PDF-1.7\nnot a complete PDF").decode()

        with self.assertRaisesRegex(ExternalAPIError, "readable PDF") as context:
            _decode_cv("resume.pdf", content)

        self.assertEqual(context.exception.error_code, "invalid_cv")
        self.assertEqual(context.exception.status_code, 400)

    def test_rejects_invalid_base64(self):
        with self.assertRaisesRegex(ExternalAPIError, "valid base64"):
            _decode_cv("resume.pdf", "/home/user/resume.pdf")

    def test_rejects_oversized_uploaded_file(self):
        uploaded_file = SimpleNamespace(
            filename="resume.pdf",
            stream=BytesIO(b"x" * (MAX_CV_SIZE + 1)),
        )

        with self.assertRaisesRegex(ExternalAPIError, "must not exceed 5 MB"):
            _read_uploaded_cv(uploaded_file)

    def test_rejects_invalid_phone_and_numbers(self):
        for value in (float("nan"), float("inf"), True, -1):
            with self.subTest(value=value), self.assertRaises(ExternalAPIError):
                _require_number(value, "expected_salary")

    def test_idempotency_hash_is_scoped_to_api_user(self):
        self.assertNotEqual(
            _idempotency_hash("retry-key", "integration-a"),
            _idempotency_hash("retry-key", "integration-b"),
        )
        self.assertNotIn("retry-key", _idempotency_hash("retry-key", "integration-a"))

    @patch("duongtest.api.frappe.conf", {"encryption_key": "test-key"})
    def test_status_otp_is_bound_to_candidate_email_and_code(self):
        digest = _otp_digest("APP-00001", "candidate@example.com", "123456")

        self.assertNotEqual(digest, _otp_digest("APP-00002", "candidate@example.com", "123456"))
        self.assertNotEqual(digest, _otp_digest("APP-00001", "other@example.com", "123456"))
        self.assertNotEqual(digest, _otp_digest("APP-00001", "candidate@example.com", "654321"))

    def test_verification_cache_key_does_not_contain_candidate_data(self):
        key = _verification_cache_key("APP-00001", "candidate@example.com")

        self.assertNotIn("APP-00001", key)
        self.assertNotIn("candidate@example.com", key)

    @patch("duongtest.api.frappe.session", SimpleNamespace(user="Guest"))
    def test_guest_is_rejected_with_sanitized_auth_error(self):
        response = _integration_authorized()

        self.assertEqual(response["error"]["code"], "authentication_required")
        self.assertEqual(frappe.local.response.get("http_status_code"), 401)
        self.assertNotIn("traceback", str(response).lower())

    @patch("duongtest.api.frappe.get_roles", return_value=["HR Officer"])
    @patch("duongtest.api.frappe.session", SimpleNamespace(user="hr@example.com"))
    def test_non_integration_user_is_rejected(self, _get_roles):
        response = _integration_authorized()

        self.assertEqual(response["error"]["code"], "forbidden")
        self.assertEqual(frappe.local.response.get("http_status_code"), 403)

    def test_public_status_map_has_no_internal_details(self):
        self.assertEqual(
            PUBLIC_STATUS_MESSAGES["Rejected"],
            ("Closed", "Quy trình tuyển dụng cho hồ sơ này đã kết thúc."),
        )
        self.assertNotIn("expected_salary", str(PUBLIC_STATUS_MESSAGES))
        self.assertNotIn("interviewer", str(PUBLIC_STATUS_MESSAGES))

    @patch("duongtest.api._otp_digest", return_value="stored-digest")
    @patch("duongtest.api.secrets.randbelow", return_value=12345)
    @patch("duongtest.api.frappe.sendmail")
    @patch("duongtest.api.frappe.cache")
    @patch("duongtest.api.frappe.db.get_value")
    def test_status_lookup_uses_email_code_and_returns_only_public_fields(
        self, get_value, cache, sendmail, _randbelow, _otp_digest
    ):
        applicant = SimpleNamespace(
            name="private-db-name",
            position_title="Software Engineer",
            applicant_status="Interviewing",
        )
        get_value.side_effect = ["private-db-name", applicant]
        cache.get_value.side_effect = [None, json.dumps({"digest": "stored-digest", "attempts": 0})]
        cache.incrby.return_value = 1

        request_response = request_status_code("APP-00001", "candidate@example.com")
        status_response = get_application_status("APP-00001", "candidate@example.com", "012345")

        self.assertTrue(request_response["success"])
        sendmail.assert_called_once()
        self.assertTrue(status_response["success"])
        self.assertEqual(
            set(status_response),
            {"success", "applicant_code", "position", "status", "next_message"},
        )
        self.assertEqual(status_response["status"], "In Progress")
        self.assertNotIn("expected_salary", status_response)
        self.assertNotIn("interviewer", status_response)
        cache.delete_value.assert_called_once()

    @patch("duongtest.api.frappe.db.get_value", return_value=None)
    @patch("duongtest.api.frappe.sendmail")
    def test_status_code_request_does_not_disclose_unknown_applicant(self, sendmail, _get_value):
        response = request_status_code("APP-UNKNOWN", "candidate@example.com")

        self.assertTrue(response["success"])
        sendmail.assert_not_called()

    @patch("duongtest.api.frappe.db.get_value")
    @patch("duongtest.api.frappe.cache")
    def test_wrong_otp_is_rejected_and_attempt_count_is_updated(self, cache, get_value):
        applicant = SimpleNamespace(
            name="private-db-name",
            position_title="Software Engineer",
            applicant_status="New",
        )
        get_value.return_value = applicant
        cache.get_value.return_value = json.dumps({"digest": "not-the-code", "attempts": 0})

        response = get_application_status("APP-00001", "candidate@example.com", "111111")

        self.assertEqual(response["error"]["code"], "verification_failed")
        self.assertEqual(frappe.local.response.get("http_status_code"), 401)
        cache.set_value.assert_called_once()
