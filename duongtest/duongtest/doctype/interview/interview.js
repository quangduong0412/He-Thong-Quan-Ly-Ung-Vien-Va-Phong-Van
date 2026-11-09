// Copyright (c) 2026, Duong Nguyen and contributors
// For license information, please see license.txt

frappe.ui.form.on("Interview", {
	setup(frm) {
		frm.set_query("job_applicant", () => ({
			filters: {
				applicant_status: [
					"in",
					["Screening", "Interview Scheduled", "Interviewing"],
				],
			},
		}));
		frm.set_query("interview_round", () => ({ filters: { active: 1 } }));
	},

	interview_method(frm) {
		if (frm.doc.interview_method !== "Online") {
			frm.set_value("meeting_url", "");
		}
		if (frm.doc.interview_method !== "Onsite") {
			frm.set_value("location", "");
		}
		frm.toggle_reqd("meeting_url", frm.doc.interview_method === "Online");
		frm.toggle_reqd("location", frm.doc.interview_method === "Onsite");
	},

	refresh(frm) {
		frm.trigger("interview_method");
	},
});
