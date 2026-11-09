import frappe
from frappe import _

HR_ROLES = {"HR Officer", "HR Manager", "System Manager"}
SECURITY_ROLES = {"HR Officer", "HR Manager", "Interviewer", "Recruitment API Integration"}


def ensure_security_roles():
    for role_name in SECURITY_ROLES:
        if not frappe.db.exists("Role", role_name):
            frappe.get_doc(
                {
                    "doctype": "Role",
                    "role_name": role_name,
                    "desk_access": role_name != "Recruitment API Integration",
                    "is_custom": 1,
                }
            ).insert(ignore_permissions=True)


def has_sensitive_record_permission(doc, ptype=None, user=None, debug=False):
    user = user or frappe.session.user
    roles = set(frappe.get_roles(user))

    if doc.doctype == "File":
        cv_file = get_cv_file_reference(doc)
        if cv_file:
            if ptype in ("read", "select"):
                return can_access_cv_file(cv_file, user)
            if ptype in ("create", "write", "delete"):
                return can_modify_cv_file(cv_file, user, ptype)
            return False

    if doc.doctype == "Interview Feedback" and ptype in ("read", "select", "share"):
        if roles & HR_ROLES:
            return True
        if "Interviewer" not in roles or doc.interviewer != user or not doc.interview_:
            return False
        return is_assigned_interviewer(doc.interview_, user)

    if doc.doctype == "Job Applicant" and ptype in ("read", "select"):
        if roles & HR_ROLES:
            return True
        if "Interviewer" not in roles:
            return False
        return has_assigned_interview(doc.name, user)

    if doc.doctype == "Interview" and ptype in ("read", "select"):
        if roles & HR_ROLES:
            return True
        if "Interviewer" not in roles:
            return False
        return is_assigned_interviewer(doc.name, user)

    return None


def get_interview_feedback_permission_query(user=None, doctype=None):
    user = user or frappe.session.user
    roles = set(frappe.get_roles(user))
    if roles & HR_ROLES:
        return ""
    if "Interviewer" not in roles:
        return "1=0"

    safe_user = frappe.db.escape(user)
    return f"""`tabInterview Feedback`.`interviewer` = {safe_user}
        AND EXISTS (
            SELECT 1
            FROM `tabInterviewer Assignment` assignment
            WHERE assignment.parent = `tabInterview Feedback`.`interview_`
                AND assignment.parenttype = 'Interview'
                AND assignment.parentfield = 'interviewers'
                AND assignment.interviewer = {safe_user}
        )"""


def get_job_applicant_permission_query(user=None, doctype=None):
    user = user or frappe.session.user
    roles = set(frappe.get_roles(user))
    if roles & HR_ROLES:
        return ""
    if "Interviewer" not in roles:
        return "1=0"

    safe_user = frappe.db.escape(user)
    return f"""EXISTS (
        SELECT 1
        FROM `tabInterview` interview
        INNER JOIN `tabInterviewer Assignment` assignment
            ON assignment.parent = interview.name
            AND assignment.parenttype = 'Interview'
            AND assignment.parentfield = 'interviewers'
        WHERE interview.job_applicant = `tabJob Applicant`.`name`
            AND assignment.interviewer = {safe_user}
    )"""


def get_interview_permission_query(user=None, doctype=None):
    user = user or frappe.session.user
    roles = set(frappe.get_roles(user))
    if roles & HR_ROLES:
        return ""
    if "Interviewer" not in roles:
        return "1=0"

    safe_user = frappe.db.escape(user)
    return f"""EXISTS (
        SELECT 1
        FROM `tabInterviewer Assignment` assignment
        WHERE assignment.parent = `tabInterview`.`name`
            AND assignment.parenttype = 'Interview'
            AND assignment.parentfield = 'interviewers'
            AND assignment.interviewer = {safe_user}
    )"""


def is_assigned_interviewer(interview_name, user):
    return bool(
        frappe.db.exists(
            "Interviewer Assignment",
            {
                "parent": interview_name,
                "parenttype": "Interview",
                "parentfield": "interviewers",
                "interviewer": user,
            },
        )
    )


def has_assigned_interview(applicant_name, user):
    return bool(
        frappe.db.sql(
            """
            SELECT 1
            FROM `tabInterview` interview
            INNER JOIN `tabInterviewer Assignment` assignment
                ON assignment.parent = interview.name
                AND assignment.parenttype = 'Interview'
                AND assignment.parentfield = 'interviewers'
            WHERE interview.job_applicant = %s
                AND assignment.interviewer = %s
            LIMIT 1
            """,
            (applicant_name, user),
        )
    )


def can_access_cv_file(file_doc, user=None):
    user = user or frappe.session.user
    if (
        file_doc.attached_to_doctype != "Job Applicant"
        or file_doc.attached_to_field != "cv_attachment"
        or not file_doc.attached_to_name
        or not file_doc.is_private
    ):
        return False

    applicant = frappe.get_doc("Job Applicant", file_doc.attached_to_name)
    if applicant.cv_attachment != file_doc.file_url:
        return False
    return frappe.has_permission("Job Applicant", "read", doc=applicant, user=user)


def get_cv_file_reference(file_doc):
    if (
        file_doc.attached_to_doctype == "Job Applicant"
        and file_doc.attached_to_field == "cv_attachment"
    ):
        return file_doc

    previous = file_doc.get_doc_before_save()
    if previous and (
        previous.attached_to_doctype == "Job Applicant"
        and previous.attached_to_field == "cv_attachment"
    ):
        return previous
    return None


def can_modify_cv_file(file_doc, user, ptype):
    applicant_name = file_doc.attached_to_name
    if not applicant_name:
        return False

    if frappe.db.exists("Job Applicant", applicant_name):
        applicant = frappe.get_doc("Job Applicant", applicant_name)
        return frappe.has_permission("Job Applicant", "write", doc=applicant, user=user)

    return ptype == "create" and frappe.has_permission("Job Applicant", "create", user=user)


def secure_existing_cv_files():
    applicants = frappe.get_all(
        "Job Applicant",
        filters={"cv_attachment": ["is", "set"]},
        fields=["name", "cv_attachment"],
    )
    public_urls = {
        applicant.cv_attachment
        for applicant in applicants
        if applicant.cv_attachment and not applicant.cv_attachment.startswith("/private/files/")
    }

    for file_url in public_urls:
        if not file_url.startswith("/files/"):
            frappe.throw(
                _("Cannot secure CV {0}: only locally stored CV files can be migrated automatically.").format(
                    file_url
                )
            )

        file_names = frappe.get_all(
            "File",
            filters={
                "file_url": file_url,
                "attached_to_doctype": "Job Applicant",
            },
            pluck="name",
        )
        if not file_names:
            frappe.throw(
                _("Cannot secure CV {0}: no attached File record was found.").format(file_url)
            )

        file_doc = frappe.get_doc("File", file_names[0])
        if file_doc.is_private:
            frappe.throw(
                _("Cannot secure CV {0}: its File privacy flag conflicts with its public URL.").format(
                    file_url
                )
            )
        file_doc.is_private = 1
        file_doc.save(ignore_permissions=True)

        attached_applicants = [
            applicant for applicant in applicants if applicant.cv_attachment == file_url
        ]
        for applicant in attached_applicants:
            frappe.db.set_value(
                "Job Applicant",
                applicant.name,
                "cv_attachment",
                file_doc.file_url,
            )
            if not frappe.db.exists(
                "File",
                {
                    "file_url": file_doc.file_url,
                    "attached_to_doctype": "Job Applicant",
                    "attached_to_name": applicant.name,
                    "attached_to_field": "cv_attachment",
                },
            ):
                file_doc.create_attachment_copy(
                    "Job Applicant",
                    applicant.name,
                    "cv_attachment",
                    ignore_permissions=True,
                )
