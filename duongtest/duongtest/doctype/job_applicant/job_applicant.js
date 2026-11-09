// Copyright (c) 2026, Duong Nguyen and contributors
// For license information, please see license.txt

frappe.ui.form.on("Job Applicant", {
	setup(frm) {
		frm.set_query("recruitment_request", () => ({
			filters: {
				docstatus: 1,
				workflow_state: "Approved",
			},
		}));
	},

	recruitment_request(frm) {
		if (!frm.doc.recruitment_request) {
			frm.set_value({ position_title: "", department: "" });
			return;
		}

		frappe.db
			.get_value("Recruitment Request", frm.doc.recruitment_request, [
				"position_title",
				"department_",
			])
			.then(({ message }) => {
				if (message) {
					frm.set_value({
						position_title: message.position_title,
						department: message.department_,
					});
				}
			});
	},

	refresh(frm) {
		frm.toggle_reqd(
			"cv_attachment",
			!["New", "Rejected"].includes(frm.doc.applicant_status)
		);
		frm.toggle_display(
			"rejection_reason",
			frm.doc.applicant_status === "Rejected"
		);
	},

	applicant_status(frm) {
		frm.toggle_reqd(
			"cv_attachment",
			!["New", "Rejected"].includes(frm.doc.applicant_status)
		);
		frm.toggle_display(
			"rejection_reason",
			frm.doc.applicant_status === "Rejected"
		);
	},
});
