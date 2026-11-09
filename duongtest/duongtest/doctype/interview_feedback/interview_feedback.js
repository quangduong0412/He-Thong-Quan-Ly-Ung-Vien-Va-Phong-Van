// Copyright (c) 2026, Duong Nguyen and contributors
// For license information, please see license.txt

frappe.ui.form.on("Interview Feedback", {
	refresh(frm) {
		if (frm.is_new()) {
			frm.set_value("interviewer", frappe.session.user);
		}

		if (frm.doc.is_submitted) {
			frm.disable_form();
			return;
		}

		if (!frm.is_new()) {
			frm.add_custom_button(__("Submit Feedback"), () => {
				frm.call("submit_feedback").then(() => frm.reload_doc());
			}).addClass("btn-primary");
		}
	},

	interview_(frm) {
		if (!frm.doc.interview_) {
			frm.set_value("job_applicant", "");
			return;
		}

		frappe.db.get_doc("Interview", frm.doc.interview_).then((interview) => {
			frm.set_value("job_applicant", interview.job_applicant);
		});
	},
});
