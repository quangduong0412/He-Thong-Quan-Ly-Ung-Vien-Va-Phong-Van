"use strict";

var JOB_APPLICANT_PAGE_SIZE = 100;
var JOB_APPLICANT_FIELDS = [
  "name",
  "applicant_code",
  "applicant_name",
  "email",
  "phone_number",
  "position_title",
  "department",
  "recruitment_request",
  "application_source",
  "assigned_hr_officer",
  "applicant_status",
  "years_of_experience",
  "available_from",
  "cv_attachment",
  "creation",
];

function jobApplicantFields() {
  const roles = (SESSION && SESSION.roles) || [];
  const mayReadSalary = ["HR Officer", "HR Manager", "System Manager"].some((role) =>
    roles.includes(role),
  );
  return mayReadSalary ? [...JOB_APPLICANT_FIELDS, "expected_salary"] : JOB_APPLICANT_FIELDS;
}

async function fetchJobApplicantPage(start, fields) {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    order_by: "creation desc, modified desc, name desc",
    limit_start: String(start),
    limit_page_length: String(JOB_APPLICANT_PAGE_SIZE),
  });

  const response = await fetch(`/api/resource/Job%20Applicant?${params}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Không thể tải hồ sơ ứng viên (HTTP ${response.status}).`);
  }

  const body = await response.json();
  if (!body || !Array.isArray(body.data)) {
    throw new Error("Dữ liệu hồ sơ ứng viên từ máy chủ không hợp lệ.");
  }
  return body.data;
}

async function fetchJobApplicants() {
  const fields = jobApplicantFields();
  const records = [];
  let start = 0;
  while (true) {
    const page = await fetchJobApplicantPage(start, fields);
    records.push(...page);
    if (page.length < JOB_APPLICANT_PAGE_SIZE) break;
    start += page.length;
  }

  return records.map((record) => ({
    docName: record.name,
    code: record.applicant_code || record.name,
    name: record.applicant_name || "",
    email: record.email || "",
    phone: record.phone_number || "",
    position: record.position_title || "",
    dept: record.department || "",
    reqCode: record.recruitment_request || "",
    source: record.application_source || "",
    hr: record.assigned_hr_officer || "",
    stage: record.applicant_status || "New",
    exp: Number(record.years_of_experience || 0),
    expected:
      fields.includes("expected_salary") && record.expected_salary != null
        ? Number(record.expected_salary)
        : null,
    available: record.available_from || "",
    applied: record.creation ? record.creation.slice(0, 10) : "",
    cvAttachment: record.cv_attachment || "",
    tags: [],
    isLive: true,
  }));
}

async function loadJobApplicants(refresh = false) {
  if (state.app.loading || (!refresh && state.app.records !== null)) return;

  state.app.loading = true;
  state.app.loadError = "";
  if (state.page === "applicants") render();
  try {
    state.app.records = await fetchJobApplicants();
  } catch (error) {
    console.error("Failed to load Job Applicant records.", error);
    state.app.loadError =
      error instanceof Error ? error.message : "Không thể tải hồ sơ ứng viên.";
  } finally {
    state.app.loading = false;
    if (state.page === "applicants") {
      render();
      updateAppCount();
    }
  }
}