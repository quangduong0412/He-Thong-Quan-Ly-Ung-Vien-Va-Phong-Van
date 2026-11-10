import base64
import binascii
import hashlib
import hmac
import json
import math
import re
import secrets
import zipfile
from io import BytesIO

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import validate_email_address
from frappe.utils.file_manager import save_file
from pypdf import PdfReader, errors

INTEGRATION_ROLE = "Recruitment API Integration"
MAX_CV_SIZE = 5 * 1024 * 1024
OTP_TTL_SECONDS = 600
OTP_MAX_ATTEMPTS = 5
OTP_MAX_REQUESTS_PER_HOUR = 3

PUBLIC_STATUS_MESSAGES = {
    "New": ("Received", "Hồ sơ đã được tiếp nhận."),
    "Screening": ("In Review", "Hồ sơ đang được xem xét."),
    "Interview Scheduled": ("In Progress", "Hồ sơ đang trong quá trình phỏng vấn."),
    "Interviewing": ("In Progress", "Hồ sơ đang trong quá trình phỏng vấn."),
    "Passed": ("In Progress", "Hồ sơ đang được tiếp tục xử lý."),
    "Rejected": ("Closed", "Quy trình tuyển dụng cho hồ sơ này đã kết thúc."),
    "Offer Sent": ("Action Required", "Vui lòng kiểm tra email để xem thông tin tiếp theo."),
    "Offer Declined": ("Closed", "Quy trình tuyển dụng cho hồ sơ này đã kết thúc."),
    "Hired": ("Completed", "Quy trình tuyển dụng đã hoàn tất."),
}


class ExternalAPIError(Exception):
    def __init__(self, message, status_code, error_code):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code


def _response(data, status_code=200):
    frappe.local.response["http_status_code"] = status_code
    return data


def _error(error_code, message, status_code):
    return _response(
        {"success": False, "error": {"code": error_code, "message": message}},
        status_code,
    )


def _require_text(value, field, max_length):
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > max_length:
        raise ExternalAPIError(
            _("{0} is required and must be at most {1} characters.").format(field, max_length),
            400,
            "invalid_input",
        )
    return value.strip()


def _require_number(value, field, maximum=None):
    if isinstance(value, bool):
        raise ExternalAPIError(_("{0} must be a valid number.").format(field), 400, "invalid_input")
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ExternalAPIError(_("{0} must be a valid number.").format(field), 400, "invalid_input")
    if not math.isfinite(number) or number < 0 or (maximum is not None and number > maximum):
        raise ExternalAPIError(
            _("{0} is outside the allowed range.").format(field),
            400,
            "invalid_input",
        )
    return number


def _validate_cv(filename, content):
    filename = _require_text(filename, "cv_filename", 180)
    if not isinstance(content, bytes):
        raise ExternalAPIError(_("CV content is invalid."), 400, "invalid_cv")
    if not content:
        raise ExternalAPIError(_("CV file is empty."), 400, "invalid_cv")
    if len(content) > MAX_CV_SIZE:
        raise ExternalAPIError(_("CV must not exceed 5 MB."), 413, "cv_too_large")

    extension = filename.rpartition(".")[2].lower()
    if extension == "pdf" and content.startswith(b"%PDF-"):
        try:
            PdfReader(BytesIO(content))
        except (errors.PdfReadError, ValueError):
            raise ExternalAPIError(_("CV must be a readable PDF, DOC, or DOCX file."), 400, "invalid_cv")
        return filename, content

    if extension == "doc" and content.startswith(bytes.fromhex("D0CF11E0A1B11AE1")):
        return filename, content

    if extension == "docx" and content.startswith(b"PK"):
        try:
            with zipfile.ZipFile(BytesIO(content)) as archive:
                entries = archive.infolist()
                if (
                    len(entries) <= 200
                    and sum(entry.file_size for entry in entries) <= 10 * 1024 * 1024
                    and "word/document.xml" in archive.namelist()
                ):
                    return filename, content
        except (OSError, zipfile.BadZipFile):
            pass

    raise ExternalAPIError(_("CV must be a readable PDF, DOC, or DOCX file."), 400, "invalid_cv")


def _decode_cv(filename, encoded_content):
    if not isinstance(encoded_content, str):
        raise ExternalAPIError(_("CV content must be base64 text."), 400, "invalid_cv")

    encoded_content = encoded_content.strip()
    if encoded_content.startswith("data:"):
        _header, separator, encoded_content = encoded_content.partition(",")
        if not separator:
            raise ExternalAPIError(_("CV content is invalid."), 400, "invalid_cv")
    if len(encoded_content) > ((MAX_CV_SIZE + 2) // 3) * 4:
        raise ExternalAPIError(_("CV must not exceed 5 MB."), 413, "cv_too_large")

    try:
        content = base64.b64decode(encoded_content, validate=True)
    except (ValueError, binascii.Error):
        raise ExternalAPIError(_("CV content must be valid base64."), 400, "invalid_cv")
    return _validate_cv(filename, content)


def _read_uploaded_cv(uploaded_file):
    content = uploaded_file.stream.read(MAX_CV_SIZE + 1)
    if len(content) > MAX_CV_SIZE:
        raise ExternalAPIError(_("CV must not exceed 5 MB."), 413, "cv_too_large")
    return _validate_cv(uploaded_file.filename, content)


def _resolve_recruitment_request(recruitment_request, position_title):
    if recruitment_request:
        request_name = _require_text(recruitment_request, "recruitment_request", 140)
        request = frappe.db.get_value(
            "Recruitment Request",
            request_name,
            ["name", "docstatus", "workflow_state", "position_title", "number_of_employees"],
            as_dict=True,
        )
        if not request:
            raise ExternalAPIError(_("Recruitment request was not found."), 404, "request_not_found")
        requests = [request]
    else:
        title = _require_text(position_title, "position_title", 140)
        requests = frappe.get_all(
            "Recruitment Request",
            filters={"position_title": title, "docstatus": 1, "workflow_state": "Approved"},
            fields=["name", "docstatus", "workflow_state", "position_title", "number_of_employees"],
            limit_page_length=2,
        )
        if not requests:
            raise ExternalAPIError(
                _("No approved recruitment request matches this position."),
                404,
                "request_not_found",
            )
        if len(requests) > 1:
            raise ExternalAPIError(
                _("More than one approved request matches this position; provide recruitment_request."),
                400,
                "ambiguous_position",
            )

    request = requests[0]
    if request.docstatus != 1 or request.workflow_state != "Approved":
        raise ExternalAPIError(_("Recruitment request is not approved and open."), 409, "request_not_open")

    hired_count = frappe.db.count(
        "Job Applicant",
        {"recruitment_request": request.name, "applicant_status": "Hired"},
    )
    if hired_count >= request.number_of_employees:
        raise ExternalAPIError(_("Recruitment request has reached its hiring target."), 409, "request_fulfilled")
    return request


def _idempotency_hash(key, user):
    return hashlib.sha256(f"{user}:{key}".encode()).hexdigest()


def _payload_hash(request_reference, applicant_name, email, phone, experience, salary, filename, content):
    digest = hashlib.sha256(content).hexdigest()
    canonical = json.dumps(
        [request_reference, applicant_name, email, phone, experience, salary, filename, digest],
        ensure_ascii=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


def _integration_authorized():
    if frappe.session.user == "Guest":
        return _error("authentication_required", _("Authentication is required."), 401)
    if INTEGRATION_ROLE not in frappe.get_roles(frappe.session.user):
        return _error("forbidden", _("This account is not authorized for application intake."), 403)
    return None


def _application_response(applicant, duplicate=False):
    return {
        "success": True,
        "message": _("Application was already received.") if duplicate else _("Application received successfully."),
        "applicant_code": applicant.applicant_code,
        "status": applicant.applicant_status,
        "duplicate": duplicate,
    }


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=100, seconds=60 * 60, methods=["POST"])
def submit_application(
    recruitment_request=None,
    position_title=None,
    applicant_name=None,
    email=None,
    phone_number=None,
    cv_filename=None,
    cv_base64=None,
    years_of_experience=None,
    expected_salary=None,
    idempotency_key=None
):
    """Receive a validated application using a private upload or a base64 CV."""
    try:
        
        applicant = frappe.get_doc(
            {
                "doctype": "Job Applicant",
                "applicant_name": applicant_name,
                "email": email,
                "phone_number": phone_number,
                "recruitment_request": recruitment_request,
                "application_source": "Other",
                "years_of_experience": years_of_experience,
                "expected_salary": expected_salary,
                "applicant_status": "New"
            }
        ).insert(ignore_permissions=True)
        applicant.save(ignore_permissions=True)
        applicant.submit()
        frappe.logger("duongtest.api").info("External application accepted.")
        return _response(_application_response(applicant), 201)
    except ExternalAPIError as error:
        return _error(error.error_code, str(error), error.status_code)
    except frappe.DuplicateEntryError:
        frappe.db.rollback()
        previous = (
            frappe.db.get_value(
                "Job Applicant",
                {"external_idempotency_hash": key_hash},
                ["applicant_code", "applicant_status", "external_payload_hash"],
                as_dict=True,
            )
        )
        frappe.logger("duongtest.api").info("Duplicate external application submission rejected.")
        return _error("duplicate_application", _("An application with these details already exists."), 409)
    except frappe.ValidationError as error:
        frappe.db.rollback()
        return _error("application_rejected", _("Application data was rejected by validation." + error), 400)
    except Exception:
        frappe.db.rollback()
        frappe.logger("duongtest.api").exception("External application intake failed.")
        return _error("internal_error", _("The application could not be processed."), 500)


def _verification_cache_key(applicant_name, email):
    identity_hash = hashlib.sha256(f"{applicant_name}:{email}".encode()).hexdigest()
    return f"external_application_status_otp:{identity_hash}"


def _otp_digest(applicant_name, email, otp):
    secret = frappe.conf.get("encryption_key")
    if not secret:
        raise RuntimeError("The site encryption_key is not configured.")
    message = f"{applicant_name}:{email}:{otp}".encode()
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=10, seconds=60 * 60, methods=["POST"])
def request_status_code(applicant_code=None, email=None):
    """Email a short-lived verification code without disclosing record matches."""
    cache_key = None
    try:
        applicant_code = _require_text(applicant_code, "applicant_code", 32)
        email = validate_email_address(_require_text(email, "email", 254))
        if not email or "," in email:
            raise ExternalAPIError(_("A single valid email address is required."), 400, "invalid_input")
        email = email.lower()
        applicant_name = frappe.db.get_value(
            "Job Applicant",
            {"applicant_code": applicant_code, "email": email, "docstatus": 1},
            "name",
        )
        if applicant_name:
            otp = f"{secrets.randbelow(1_000_000):06d}"
            cache_key = _verification_cache_key(applicant_name, email)
            rate_key = f"{cache_key}:requests"
            if frappe.cache.get_value(rate_key) is None:
                frappe.cache.set_value(rate_key, 0, expires_in_sec=60 * 60)
            if frappe.cache.incrby(rate_key, 1) > OTP_MAX_REQUESTS_PER_HOUR:
                return _response(
                    {
                        "success": True,
                        "message": _("If the application details match, a verification code will be sent."),
                    }
                )
            challenge = json.dumps({"digest": _otp_digest(applicant_name, email, otp), "attempts": 0})
            frappe.cache.set_value(cache_key, challenge, expires_in_sec=OTP_TTL_SECONDS)
            frappe.sendmail(
                recipients=[email],
                subject=_("Verification code for your application"),
                message=_("Your application status verification code is {0}. It expires in 10 minutes.").format(
                    otp
                ),
                delayed=False,
                redact_message_after_send=True,
            )
        frappe.logger("duongtest.api").info("Application status verification requested.")
        return _response(
            {
                "success": True,
                "message": _("If the application details match, a verification code will be sent."),
            }
        )
    except ExternalAPIError as error:
        return _error(error.error_code, str(error), error.status_code)
    except Exception:
        if cache_key:
            frappe.cache.delete_value(cache_key)
        frappe.logger("duongtest.api").exception("Application status verification request failed.")
        return _error("internal_error", _("The verification request could not be processed."), 500)


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=20, seconds=60 * 60, methods=["POST"])
def get_application_status(applicant_code=None, email=None, verification_code=None):
    """Return only public application status fields after OTP verification."""
    try:
        applicant_code = _require_text(applicant_code, "applicant_code", 32)
        email = validate_email_address(_require_text(email, "email", 254))
        verification_code = _require_text(verification_code, "verification_code", 6)
        if not email or "," in email or not re.fullmatch(r"\d{6}", verification_code):
            raise ExternalAPIError(_("Application code or verification code is invalid."), 401, "verification_failed")
        email = email.lower()
        applicant = frappe.db.get_value(
            "Job Applicant",
            {"applicant_code": applicant_code, "email": email, "docstatus": 1},
            ["name", "position_title", "applicant_status"],
            as_dict=True,
        )
        if not applicant:
            return _error(
                "verification_failed",
                _("Application code or verification code is invalid."),
                401,
            )

        cache_key = _verification_cache_key(applicant.name, email)
        cached = frappe.cache.get_value(cache_key)
        if not cached:
            return _error(
                "verification_failed",
                _("Application code or verification code is invalid or expired."),
                401,
            )
        if isinstance(cached, bytes):
            cached = cached.decode()
        challenge = json.loads(cached)
        if challenge.get("attempts", OTP_MAX_ATTEMPTS) >= OTP_MAX_ATTEMPTS:
            frappe.cache.delete_value(cache_key)
            return _error(
                "verification_failed",
                _("Application code or verification code is invalid or expired."),
                401,
            )

        expected_digest = _otp_digest(applicant.name, email, verification_code)
        if not hmac.compare_digest(challenge["digest"], expected_digest):
            challenge["attempts"] += 1
            if challenge["attempts"] >= OTP_MAX_ATTEMPTS:
                frappe.cache.delete_value(cache_key)
            else:
                frappe.cache.set_value(cache_key, json.dumps(challenge), expires_in_sec=OTP_TTL_SECONDS)
            return _error(
                "verification_failed",
                _("Application code or verification code is invalid."),
                401,
            )

        frappe.cache.delete_value(cache_key)
        public_status, next_message = PUBLIC_STATUS_MESSAGES.get(
            applicant.applicant_status,
            ("In Review", "Hồ sơ đang được xem xét."),
        )
        frappe.logger("duongtest.api").info("Application status lookup completed.")
        return _response(
            {
                "success": True,
                "applicant_code": applicant_code,
                "position": applicant.position_title,
                "status": public_status,
                "next_message": next_message,
            }
        )
    except ExternalAPIError as error:
        return _error(error.error_code, str(error), error.status_code)
    except Exception:
        frappe.logger("duongtest.api").exception("Application status lookup failed.")
        return _error("internal_error", _("The status request could not be processed."), 500)