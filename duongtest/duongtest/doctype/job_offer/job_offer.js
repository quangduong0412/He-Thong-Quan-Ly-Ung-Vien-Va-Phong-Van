// Copyright (c) 2026, Duong Nguyen and contributors
// For license information, please see license.txt

frappe.ui.form.on("Job Offer", {
	setup(frm) {
		frm.set_query("job_applicant", () => ({
			filters: { applicant_status: "Passed" },
		}));
	},

	job_applicant(frm) {
		if (!frm.doc.job_applicant) {
			frm.set_value({
				recruitment_request: "",
				position_itle: "",
				department: "",
			});
			return;
		}

		frappe.db
			.get_value("Job Applicant", frm.doc.job_applicant, [
				"recruitment_request",
				"position_title",
				"department",
			])
			.then(({ message }) => {
				if (message) {
					frm.set_value({
						recruitment_request: message.recruitment_request,
						position_itle: message.position_title,
						department: message.department,
					});
				}
			});
	},
});
