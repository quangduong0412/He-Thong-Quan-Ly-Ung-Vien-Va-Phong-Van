# Hướng dẫn hiển thị DocType Interview lên giao diện

Tài liệu này hướng dẫn nối trang **Phỏng vấn** trong frontend hiện tại với dữ liệu thật của DocType `Interview`, từ kiểm tra schema, tạo loader, nối trạng thái và giao diện đến build, kiểm tra quyền và kiểm thử.

> Hướng dẫn tập trung vào **đọc và hiển thị dữ liệu**. Đổi lịch, hủy lịch, đổi trạng thái và gửi feedback là các thao tác ghi; không được giữ cách thay đổi mảng JavaScript như bản mô phỏng. Chỉ bật các thao tác đó sau khi đã nối API backend, kiểm tra quyền và xử lý lỗi server.

## 1. Hiện trạng trong dự án

Backend đã có:

- Schema DocType tại `duongtest/duongtest/doctype/interview/interview.json`.
- Controller và quy tắc nghiệp vụ tại `duongtest/duongtest/doctype/interview/interview.py`.
- Bảng con người phỏng vấn `Interviewer Assignment`.
- Quyền đọc Interview được giới hạn bằng `permissions.py` và khai báo trong `hooks.py`.

Frontend hiện có:

- Trang danh sách, lịch tuần, drawer chi tiết và feedback tại `frontend/src/pages/interviews.js`.
- Dữ liệu giả `INTERVIEWS` và danh sách `INTERVIEWERS`, `ROUNDS`, `INT_STATUSES` trong `frontend/src/data.js`.
- State lọc/view trong `frontend/src/state.js`.
- Các thao tác giao diện trong `frontend/src/actions.js`.
- Hàm `findInt()` trong `frontend/src/utils.js` hiện đọc mảng giả `INTERVIEWS`.

Do đó, chỉ thay `INTERVIEWS` ở một vị trí sẽ không hoàn thành việc nối dữ liệu: lịch, drawer, feedback, ứng viên liên quan và thao tác trong menu cũng phụ thuộc dữ liệu giả đó.

## 2. Trường dữ liệu cần hiển thị

Các field chính trong DocType:

| Field DocType | Ý nghĩa | Dùng trên giao diện |
|---|---|---|
| `name` | Khóa bản ghi Frappe | Mã nội bộ, khóa mở chi tiết |
| `job_applicant` | Link đến `Job Applicant` | Tên/mã ứng viên và link hồ sơ |
| `interview_round` | Link đến `Interview Round` | Tên vòng phỏng vấn |
| `start_time` | Thời điểm bắt đầu | Ngày và giờ bắt đầu |
| `end_time` | Thời điểm kết thúc | Giờ kết thúc |
| `interview_method` | Phương thức | Online hoặc Onsite |
| `location` | Địa điểm trực tiếp | Hiển thị khi Onsite |
| `meeting_url` | URL họp trực tuyến | Hiển thị khi Online; chỉ cho phép mở URL hợp lệ |
| `status` | Trạng thái lịch | Scheduled, In Progress, Completed, Cancelled, No Show |
| `total_score` | Điểm tổng hợp, read-only | Chỉ hiển thị nếu người dùng được phép xem |
| `result` | Kết quả | Pending, Passed, Failed |
| `interviewers` | Bảng con `Interviewer Assignment` | Người phỏng vấn và vai trò |
| `internal_note` | Ghi chú nội bộ, permlevel 1 | Không đưa vào API/UI chung nếu chưa xác định rõ quyền |

`interviewers` là bảng con, không nên giả định có thể lấy đầy đủ cùng truy vấn danh sách DocType chính. Tên ứng viên và tên vòng cũng là Link field nên dữ liệu danh sách có thể chỉ chứa tên document liên kết, không phải tên hiển thị thân thiện.

## 3. Luồng dữ liệu cần xây

```text
Frappe DocType Interview
  ├─ job_applicant ──> Job Applicant
  ├─ interview_round ─> Interview Round
  └─ interviewers ────> Interviewer Assignment (child table)
             │
             ▼
API có kiểm tra quyền
             │
             ▼
frontend/src/interview_data.js
             │ map field / ngày giờ
             ▼
state.int.records
             │
             ▼
frontend/src/pages/interviews.js
  ├─ Danh sách
  ├─ Lịch tuần
  └─ Drawer chi tiết
```

Frontend chỉ dùng bản ghi trả về từ API làm nguồn hiển thị. Việc lọc ở trình duyệt không thay thế giới hạn quyền ở server.

## 4. Bước 1 — Xác định quyền và dữ liệu được phép trả về

Trước khi viết loader:

1. Đọc `duongtest/permissions.py` và `duongtest/hooks.py`.
2. Xác nhận HR Officer/HR Manager/System Manager xem được những lịch nào.
3. Xác nhận Interviewer chỉ xem được lịch được phân công cho chính họ.
4. Phân loại field nhạy cảm:
   - Không đưa `internal_note` và nội dung feedback vào payload danh sách mặc định.
   - `interviewers` ở permlevel 1; chỉ trả các thông tin người phỏng vấn mà vai trò hiện tại được phép đọc.
   - Không lấy `total_score`/`result` nếu quyền xem kết quả chưa được xác nhận.
5. Dùng `frappe.get_list("Interview", ...)` hoặc API Frappe có kiểm tra permission; không dùng `get_all`/SQL thô để lấy lịch rồi mới lọc trên frontend.

Hook hiện tại đã khai báo `permission_query_conditions` và `has_permission` cho Interview. Khi thêm endpoint, endpoint vẫn phải giữ các kiểm tra đó có hiệu lực; không được dùng endpoint để vượt qua quyền trên DocType.

## 5. Bước 2 — Tạo API đọc danh sách

### Cách khuyến nghị

Tạo hoặc mở rộng API trong:

```text
duongtest/api.py
```

Một endpoint riêng phù hợp vì giao diện cần ghép:

- Field của Interview.
- Tên ứng viên/vị trí từ Job Applicant.
- Tên vòng từ Interview Round.
- Người phỏng vấn từ child table.

Endpoint nên:

- Chỉ cho người dùng đã đăng nhập.
- Dùng `frappe.get_list` cho Interview để tôn trọng permission query.
- Phân trang ở server; nhận `limit_start`, `limit_page_length` có giới hạn tối đa.
- Lọc theo thời gian hoặc khoảng ngày ở server khi số lượng bản ghi lớn.
- Chỉ lấy field cần thiết cho màn danh sách/lịch.
- Với từng `job_applicant`, `interview_round` và assignment, kiểm tra quyền trên bản ghi cha trước khi trả dữ liệu liên quan.
- Không trả feedback, ghi chú nội bộ hoặc dữ liệu không cần thiết trong list endpoint.
- Trả phản hồi ổn định, ví dụ:

```json
{
  "data": [
    {
      "name": "INT-00001",
      "job_applicant": {
        "name": "APP-00001",
        "applicant_name": "Nguyễn Văn A",
        "position_title": "Backend Developer"
      },
      "interview_round": "Technical Interview",
      "start_time": "2026-11-12 09:00:00",
      "end_time": "2026-11-12 10:00:00",
      "interview_method": "Online",
      "meeting_url": "https://meet.example.com/...",
      "status": "Scheduled",
      "interviewers": [
        {
          "interviewer": "interviewer@example.com",
          "interviewer_name": "Nguyễn Văn B",
          "interviewer_role": "Tech Lead",
          "is_lead_interviewer": 1,
          "feedback_submitted": 0
        }
      ]
    }
  ]
}
```

Đây là **hợp đồng dữ liệu minh họa**, không phải mã endpoint hoàn chỉnh. Khi viết endpoint thật, dùng cơ chế permission của Frappe và chỉ truy vấn child rows thuộc những Interview đã được phép đọc.

### Cách dùng REST Resource trực tiếp

Có thể thử `GET /api/resource/Interview` với danh sách field chính nếu bản Frappe và quyền DocType hiện tại trả dữ liệu đúng. Tuy nhiên, cần xác nhận rõ:

- `interviewers` có được trả về và giữ permission permlevel hay không.
- `Job Applicant`/`Interview Round` có cần truy vấn bổ sung để lấy nhãn thân thiện hay không.
- Interviewer chỉ nhận bản ghi được phân công.

Nếu thiếu child rows hoặc cần ghép nhiều DocType, chuyển sang API riêng ở trên; không tạo một request cho từng Interview (N+1 requests).

## 6. Bước 3 — Tạo loader frontend

Tạo file:

```text
frontend/src/interview_data.js
```

Giữ loader ở `src/` vì cấu hình `copyPrototypeAssets()` trong `frontend/vite.config.ts` chỉ copy danh sách file frontend gốc được khai báo rõ ràng. File trong `src/pages/` sẽ được copy theo thư mục pages, nhưng loader dữ liệu nên nằm ở root để thứ tự nạp dễ quản lý.

Loader cần làm các việc:

1. Gọi endpoint cùng origin bằng `fetch`, `credentials: "same-origin"` và `Accept: application/json`.
2. Kiểm tra `response.ok`; nếu lỗi thì ném lỗi có thông tin phù hợp.
3. Kiểm tra đúng cấu trúc phản hồi và mảng `data`.
4. Lấy các trang dữ liệu đến hết nếu API phân trang.
5. Map payload sang mô hình frontend mà các hàm render sử dụng.
6. Giữ khóa Frappe `name` riêng để mở bản ghi thật.
7. Không gán dữ liệu API vào biến mock `INTERVIEWS`.

Mô hình frontend gợi ý:

```js
{
  docName: "INT-00001",       // Tên document Frappe để mở Desk
  code: "INT-00001",
  applicantDocName: "APP-00001",
  applicantCode: "APP-00001",
  applicantName: "Nguyễn Văn A",
  position: "Backend Developer",
  round: "Technical Interview",
  date: "2026-11-12",         // YYYY-MM-DD cho filter và calendar
  start: "09:00",
  end: "10:00",
  method: "Online",
  location: "",
  url: "https://meet.example.com/...",
  interviewers: ["interviewer@example.com"],
  interviewerNames: ["Nguyễn Văn B"],
  lead: "interviewer@example.com",
  status: "Scheduled",
  result: "Pending",
  totalScore: null,
  isLive: true
}
```

Datetime từ Frappe thường có dạng `YYYY-MM-DD HH:mm:ss`. Parse ngày và giờ nhất quán theo timezone của site; tránh `new Date(value)` nếu kết quả thay đổi giờ giữa timezone trình duyệt và site. Tách ngày/giờ bằng helper đã được kiểm thử hoặc trả thêm giá trị đã chuẩn hóa từ server.

> Không đưa `internal_note` vào mô hình list thông thường. Nếu sau này cần hiển thị ghi chú, tạo API/detail có kiểm tra quyền riêng.

## 7. Bước 4 — Nạp loader đúng thứ tự

Trong `frontend/index.html`, thêm script:

```html
<script defer src="%BASE_URL%src/interview_data.js"></script>
```

Đặt sau `state.js` và trước `components.js`, các trang, `router.js`, `actions.js` và `main.js`. Ví dụ thứ tự:

```html
<script defer src="%BASE_URL%src/data.js"></script>
<script defer src="%BASE_URL%src/state.js"></script>
<script defer src="%BASE_URL%src/interview_data.js"></script>
<script defer src="%BASE_URL%src/utils.js"></script>
```

Thêm tên file vào mảng `files` trong `frontend/vite.config.ts`:

```ts
'interview_data.js',
```

Nếu quên một trong hai chỗ này, môi trường dev/build có thể không tìm thấy hàm loader hoặc Frappe không copy loader vào asset đầu ra.

## 8. Bước 5 — Thêm state riêng cho dữ liệu thật

Trong `frontend/src/state.js`, mở rộng `state.int`, ví dụ:

```js
int: {
  view: 'list',
  filters: {date:'', interviewer:'', round:'', status:'', method:'', feedback:''},
  weekStart: '2026-11-09',
  showFilters: false,
  loading: false,
  loadError: '',
  records: null,
},
```

Giữ tên `records` tách biệt khỏi mảng mock `INTERVIEWS`. `null` có nghĩa là chưa tải; `[]` có nghĩa là đã tải thành công nhưng không có lịch.

Tạo `loadInterviews(refresh = false)` theo mẫu loader ứng viên:

- Không gửi request lặp nếu đang loading.
- Đặt `loading = true`, xóa lỗi cũ và hiển thị trạng thái tải.
- Gọi loader API.
- Lưu dữ liệu vào `state.int.records`.
- Khi lỗi, ghi log kỹ thuật và đặt `loadError` để giao diện báo lỗi cùng nút thử lại.
- Sau khi tải xong, render lại nếu người dùng vẫn đang ở trang phỏng vấn.

## 9. Bước 6 — Nối router và hàm tìm bản ghi

### Nạp dữ liệu khi vào trang

Trong `frontend/src/router.js`, sau khi đặt `state.page` và `state.params`, gọi `loadInterviews()` khi trang là `interviews`. Không gọi lại khi mỗi lần chỉ đổi filter hoặc chuyển giữa list/calendar.

### Tra cứu Interview

`findInt()` hiện nằm trong `frontend/src/utils.js` và tìm trong mảng giả. Khi đưa lịch thật lên trang:

- Tạo cách tra cứu bản ghi theo `docName`/`name` trong `state.int.records`.
- Có thể giữ fallback mock trong giai đoạn chuyển tiếp, nhưng phải kiểm tra `isLive` để không gọi drawer/feedback giả trên bản ghi thật.
- Không để mã trên giao diện (`INT-...`) và khóa document khác nhau bị dùng lẫn.

### Tra cứu ứng viên

Không gọi `findApp()` dựa trên mảng mock cho một ứng viên từ Interview thật. Payload API nên trả `applicantName`, `applicantCode`, `position` cần thiết cho màn danh sách/drawer. Link hồ sơ có thể mở `/app/job-applicant/<docName>` cho tới khi trang chi tiết ứng viên hỗ trợ đầy đủ bản ghi đó.

## 10. Bước 7 — Thay dữ liệu trong `pages/interviews.js`

Trong `frontend/src/pages/interviews.js`:

1. Sửa `filterInterviews()` để lọc trên `state.int.records || []`.
2. Dùng giá trị lọc được suy ra từ dữ liệu thực hoặc danh sách danh mục từ API, thay vì chỉ dùng `INTERVIEWERS`, `ROUNDS`, `INT_STATUSES` hard-code.
3. Trong `intResults()`:
   - Loading: hiển thị skeleton.
   - Lỗi: hiển thị lỗi và nút thử lại.
   - Không có dữ liệu: hiển thị empty state.
   - Có dữ liệu: render danh sách.
4. Đổi mapping cột:

| Cột giao diện hiện tại | Field/mapping thật |
|---|---|
| Ứng viên | `applicantName`, mã từ `applicantCode` |
| Vị trí | `position_title` từ Job Applicant |
| Vòng phỏng vấn | `interview_round` |
| Bắt đầu/ngày | `start_time` |
| Kết thúc | `end_time` |
| Người phỏng vấn | Tên và vai trò từ `interviewers` child rows |
| Hình thức | `interview_method` |
| Địa điểm/liên kết | `location` hoặc `meeting_url` |
| Trạng thái | `status` |
| Kết quả | `result`; không suy luận từ mock feedback |

5. Calendar dùng `date`, `start`, `end` đã normalize. Loại các bản ghi ngoài tuần đang xem trước khi dựng event.
6. Escape dữ liệu văn bản bằng `esc()` trước khi chèn vào HTML.
7. Chỉ render nút “Tham gia cuộc họp” nếu phương thức là Online, URL hợp lệ với HTTPS và người dùng được phép xem lịch.

## 11. Bước 8 — Drawer chi tiết và feedback

`interviewDrawer(code)` hiện gọi `findInt()` và `findApp()` trên dữ liệu mẫu. Có hai cách chuyển tiếp:

### Giai đoạn hiển thị lịch

- Thay drawer bằng thông tin có sẵn trong payload thật.
- Hiển thị người ứng viên, vòng, thời gian, phương thức, địa điểm/URL, trạng thái và người phỏng vấn.
- Dùng link mở bản ghi Frappe Desk `/app/interview/<docName>`.
- Ẩn các nút thay đổi trạng thái, hủy, gửi feedback nếu chúng vẫn đang sửa mảng JavaScript mock.

### Giai đoạn nối feedback và thao tác

- Tạo endpoint đọc feedback riêng, kiểm tra quyền theo Interviewer được phân công/HR.
- Tạo endpoint ghi feedback hoặc cập nhật Interview riêng; kiểm tra role và trạng thái chuyển tiếp ở backend.
- Dùng DocType/controller `Interview` làm nguồn quyết định cuối cùng cho lịch trùng, lead interviewer, thứ tự vòng, thời gian, feedback đã gửi và kết quả.
- Frontend phải hiển thị lỗi từ server; chỉ cập nhật giao diện sau khi server xác nhận thành công.
- Không trả feedback của người phỏng vấn khác nếu chính sách hiện tại không cho phép.

Không dùng dữ liệu giao diện để tự tính rằng một cuộc phỏng vấn đã hoàn tất hoặc ứng viên đã đạt; controller backend có quy tắc `calculate_result()` và yêu cầu tất cả người phỏng vấn gửi feedback.

## 12. Bước 9 — Nối filter và thao tác

Trong `frontend/src/actions.js`:

- `intFilter` chỉ cập nhật `state.int.filters` rồi render lại trên `state.int.records`.
- `resetIntFilter` đặt lại filter và trang hiện tại.
- Thêm action `refreshInterviews` để gọi lại API.
- Giữ `intMenu`, `setIntStatus`, `cancelInterview`, `reschedule` ở chế độ chỉ đọc/ẩn nếu chúng còn thay đổi mảng `INTERVIEWS`.
- Chỉ bật lại sau khi có API server tương ứng và server đã enforce quyền.

Trong hàm `fbStatus(i)`, không thể dùng `i.feedback` mock để tính feedback của bản ghi thật. Hoặc API trả một trạng thái tổng hợp đã được quyền xác định, hoặc tạm hiển thị `result`/`status` thực và bỏ cột feedback cho đến khi tích hợp endpoint feedback.

## 13. Bước 10 — Phân quyền và bảo mật

- Quyền trên giao diện không thay thế quyền DocType/API.
- Interviewer chỉ được nhận lịch có assignment trùng user hiện tại. Cần thử trực tiếp với hai tài khoản Interviewer khác nhau.
- Không dùng dữ liệu từ query string để quyết định user/role; server lấy user hiện tại từ session Frappe.
- Không dùng `frappe.get_all` hoặc SQL không có điều kiện quyền cho danh sách Interview.
- Không trả `internal_note`, feedback chi tiết hoặc dữ liệu ứng viên không cần thiết cho danh sách.
- Khi gọi API ghi, gửi CSRF token theo cơ chế hiện tại trong `frontend/src/auth.js`.
- Với Meeting URL, chỉ render link an toàn; tránh chèn URL chưa escape vào thuộc tính HTML.

## 14. Bước 11 — Kiểm thử

### Backend

Mở rộng `duongtest/duongtest/doctype/interview/test_interview.py` hoặc test API riêng:

- HR xem được danh sách theo quyền.
- Interviewer chỉ xem lịch được phân công.
- Interviewer không xem lịch của người khác.
- Child assignment không rò rỉ cho người không có quyền.
- Ghi chú nội bộ/feedback không xuất hiện trong payload danh sách nếu không được phép.
- Phân trang và lọc ngày hoạt động.

### Frontend

Kiểm tra:

- API trả danh sách có lịch và danh sách rỗng.
- Loading, HTTP lỗi, payload sai định dạng, nút thử lại.
- Ngày và giờ hiển thị chính xác với timezone của site.
- Filter ngày/vòng/người phỏng vấn/trạng thái/phương thức.
- Chuyển list ↔ calendar vẫn dùng cùng dữ liệu thật.
- Mở drawer/Desk bằng đúng `docName`.
- Nút ghi bị ẩn hoặc báo lỗi rõ ràng khi chưa được nối backend.

Chạy các lệnh frontend từ thư mục repository:

```bash
yarn test
yarn typecheck
yarn build
```

Test Frappe trên site phát triển:

```bash
bench --site your-site run-tests --app duongtest --doctype Interview
```

Sau khi cập nhật metadata/API, dùng migrate/build theo quy trình môi trường phát triển:

```bash
bench --site your-site migrate
bench build --app duongtest
```

## 15. Checklist hoàn tất

- [ ] API trả dữ liệu thật từ `Interview`, không lấy `INTERVIEWS` mock làm nguồn chính.
- [ ] API giới hạn bản ghi theo quyền Frappe, đặc biệt với Interviewer.
- [ ] Payload có đủ thông tin cần thiết cho list/calendar; child table được xử lý an toàn.
- [ ] Loader mới được khai báo trong `index.html` và `vite.config.ts`.
- [ ] `state.int` có records/loading/error riêng.
- [ ] List, calendar, filter và drawer không còn giả định toàn bộ bản ghi đến từ mock.
- [ ] `findInt()`/`findApp()` không nhầm khóa Frappe với mã mock.
- [ ] Feedback, ghi chú nội bộ và meeting URL tuân theo quyền.
- [ ] Các nút ghi không sửa dữ liệu cục bộ giả; thao tác thật đi qua API backend.
- [ ] Build/test đạt và đã thử bằng HR cùng Interviewer được/không được phân công.
