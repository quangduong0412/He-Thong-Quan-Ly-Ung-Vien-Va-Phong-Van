from frappe.core.doctype.file.file import File


class SecureFile(File):
    def set_is_private(self):
        if (
            self.attached_to_doctype == "Job Applicant"
            and self.attached_to_field == "cv_attachment"
        ):
            self.is_private = 1
            return
        super().set_is_private()

    def validate(self):
        previous = self.get_doc_before_save()
        if previous and (
            previous.attached_to_doctype == "Job Applicant"
            and previous.attached_to_field == "cv_attachment"
        ):
            self.attached_to_doctype = previous.attached_to_doctype
            self.attached_to_name = previous.attached_to_name
            self.attached_to_field = previous.attached_to_field

        if (
            self.attached_to_doctype == "Job Applicant"
            and self.attached_to_field == "cv_attachment"
        ):
            self.is_private = 1

        super().validate()

    def is_downloadable(self):
        if (
            self.attached_to_doctype == "Job Applicant"
            and self.attached_to_field == "cv_attachment"
        ):
            from duongtest.permissions import can_access_cv_file

            return can_access_cv_file(self)
        return super().is_downloadable()
