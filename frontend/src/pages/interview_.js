"use strict";

var INTERVIEW =50;
var INTERVIEWS = [
    "job_applicant",
    "interview_round",
    "start_time",
    "end_time",
    "interview_method",
    "location",
    "interviewers",
    "feedback",
    "status",
    "total_score"
];

function fetchInterviewPage(start) {
  const params = new URLSearchParams({
    fields: JSON.stringify(INTERVIEWS),
    order_by: "start_time desc, modified desc, name desc",
    limit_start: String(start),
    limit_page_length: String(INTERVIEW),
  });
  return fetch(`/api/resource/Interview?${params}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Không thể tải dữ liệu phỏng vấn (HTTP ${response.status}).`);
      }
      return response.json();
    })
    .then((body) => {
      if (!body || !Array.isArray(body.data)) {
        throw new Error("Dữ liệu phỏng vấn từ máy chủ không hợp lệ.");
      }
      return body.data;
    });
}

function fetchInterviews() {
  const records = [];
  let start = 0;
  function fetchNextPage() {
    return fetchInterviewPage(start).then((page) => {
      records.push(...page);
      if (page.length < INTERVIEW) {
        return records.map((record) => ({
          code: record.name,
          app: record.job_applicant || "",
          round: record.interview_round || "",
          date: record.start_time ? record.start_time.split("T")[0] : "",
          start: record.start_time ? record.start_time.split("T")[1] : "",
          end: record.end_time ? record.end_time.split("T")[1] : "",
          method: record.interview_method || "",
          location: record.location || "",
          interviewers: record.interviewers || [],
          feedback: record.feedback || {},
          status: record.status || "",
          totalScore: Number(record.total_score || 0),
        }));
      } else {
        start += page.length;
        return fetchNextPage();
      }
    });
  }
  return fetchNextPage();
}   
async function loadInterviews(refresh = false) {
  if (state.req.loading || (!refresh && state.req.records !== null)) return;

  state.req.loading = true;
  state.req.loadError = "";
  try {
    state.req.records = await fetchInterviews();
  } catch (error) {
    console.error("Failed to load Interview records.", error);
    state.req.loadError =
      error instanceof Error ? error.message : "Không thể tải thông tin phỏng vấn.";
  } finally {
    state.req.loading = false;
    if (state.page === "interviews") render();
  }
}