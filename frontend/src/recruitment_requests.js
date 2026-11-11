"use strict";

var RECRUITMENT_REQUEST_PAGE_SIZE = 100;
var RECRUITMENT_REQUEST_FIELDS = [
  "name",
  "request_title",
  "requester_",
  "request_date",
  "department_",
  "position_title",
  "number_of_employees",
  "hired_employee_count",
  "expected_start_date",
  "employment_type",
  "priority",
  "workflow_state",
  "docstatus",
];

function recruitmentRequestApiFilters(filters) {
  const conditions = [];
  const orConditions = [];
  const add = (field, operator, value) => conditions.push([field, operator, value]);

  if (filters.state) add("workflow_state", "=", filters.state);
  if (filters.dept) add("department_", "=", filters.dept);
  if (filters.priority) add("priority", "=", filters.priority);
  if (filters.empType) add("employment_type", "=", filters.empType);
  if (filters.from) add("request_date", ">=", filters.from);
  if (filters.to) add("request_date", "<=", filters.to);

  const search = filters.search.trim();
  if (search) {
    const value = `%${search}%`;
    for (const field of ["name", "request_title", "requester_", "position_title"]) {
      orConditions.push([field, "like", value]);
    }
  }

  return { conditions, orConditions };
}

async function fetchRecruitmentRequestPage(start, filters) {
  const { conditions, orConditions } = recruitmentRequestApiFilters(filters);
  const params = new URLSearchParams({
    fields: JSON.stringify(RECRUITMENT_REQUEST_FIELDS),
    filters: JSON.stringify(conditions),
    order_by: "request_date desc, modified desc, name desc",
    limit_start: String(start),
    limit_page_length: String(RECRUITMENT_REQUEST_PAGE_SIZE),
  });
  if (orConditions.length) params.set("or_filters", JSON.stringify(orConditions));

  const response = await fetch(`/api/resource/Recruitment%20Request?${params}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Không thể tải yêu cầu tuyển dụng (HTTP ${response.status}).`);
  }

  const body = await response.json();
  if (!body || !Array.isArray(body.data)) {
    throw new Error("Dữ liệu yêu cầu tuyển dụng từ máy chủ không hợp lệ.");
  }
  return body.data;
}

async function fetchRecruitmentRequests(filters) {
  const records = [];
  let start = 0;
  while (true) {
    const page = await fetchRecruitmentRequestPage(start, filters);
    records.push(...page);
    if (page.length < RECRUITMENT_REQUEST_PAGE_SIZE) break;
    start += page.length;
  }

  return records.map((record) => ({
    code: record.name,
    title: record.request_title || "",
    requester: record.requester_ || "",
    requestDate: record.request_date || "",
    dept: record.department_ || "",
    position: record.position_title || "",
    headcount: Number(record.number_of_employees || 0),
    hired: Number(record.hired_employee_count || 0),
    startDate: record.expected_start_date || "",
    empType: record.employment_type || "",
    priority: record.priority || "",
    state:
      record.workflow_state ||
      (record.docstatus === 2 ? "Cancelled" : record.docstatus === 1 ? "Submitted" : "Draft"),
  }));
}

async function loadRecruitmentRequests(refresh = false, filters = state.req.filters) {
  if (state.req.loading || (!refresh && state.req.records !== null)) return;

  state.req.loading = true;
  state.req.loadError = "";
  if (state.page === "requests") render();
  try {
    state.req.records = await fetchRecruitmentRequests(filters);
  } catch (error) {
    console.error("Failed to load Recruitment Request records.", error);
    state.req.loadError =
      error instanceof Error ? error.message : "Không thể tải yêu cầu tuyển dụng.";
  } finally {
    state.req.loading = false;
    if (state.page === "requests") render();
  }
}
