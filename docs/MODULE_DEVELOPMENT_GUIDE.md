# Hướng dẫn phân chia và xây dựng module tuyển dụng

## 1. Mục tiêu và hiện trạng

Tài liệu này mô tả cách chia hệ thống quản lý tuyển dụng thành các module nghiệp vụ và cách triển khai một module hoàn chỉnh trong repository hiện tại.

Dự án đang dùng:

- **Backend:** Frappe/ERPNext, Python và DocType.
- **Frontend:** JavaScript thuần, HTML/CSS; các trang được đăng ký qua `PAGES`, thao tác qua `ACTIONS`/`CHANGES`/`INPUTS`.
- **Build frontend:** chạy trong thư mục `frontend`; Vite build ra `duongtest/public/frontend`.

Các trang hiện có gồm Dashboard, Yêu cầu tuyển dụng, Ứng viên, Phỏng vấn, Thư mời nhận việc, Báo cáo và Cài đặt. Backend cũng đã có nhiều DocType, controller, quyền và một số API. Tuy nhiên, phần giao diện hiện được đánh dấu là bản mô phỏng và dùng dữ liệu mẫu trong `frontend/src/data.js`; các thao tác trên trang chưa phải là luồng CRUD hoàn chỉnh nối với backend. Vì vậy, khi hoàn thiện chức năng, cần ưu tiên nối frontend với DocType/API và kiểm tra quyền ở backend, thay vì chỉ làm nút hoặc giao diện.

> Đường dẫn `mbw_assistant_mhiring/public/frontend` không phải nơi phát triển các trang tuyển dụng chính. Hãy sửa nguồn trong `frontend/src` rồi build; không sửa các tệp đầu ra trong `duongtest/public/frontend` bằng tay.

## 2. Module nghiệp vụ nên có

| Thứ tự | Module | Chức năng chính | Dữ liệu/backend hiện có |
|---|---|---|---|
| 1 | Tổ chức và phân quyền | Phòng ban, vai trò HR/Trưởng phòng/Người phỏng vấn, phân quyền xem và sửa dữ liệu nhạy cảm | `Department`, `permissions.py`, `hooks.py` |
| 2 | Cài đặt và tiêu chí tuyển dụng | Thời hạn, giới hạn số lượng, chính sách phê duyệt; danh mục và tiêu chí tuyển dụng | `Recruitment Settings`, `Recruitment Category`, `Recruitment Criterion` |
| 3 | Yêu cầu tuyển dụng | Tạo yêu cầu, khai báo vị trí/số lượng/lương/tiêu chí, gửi duyệt, duyệt, yêu cầu chỉnh sửa, từ chối, hủy và sửa đổi | `Recruitment Request` |
| 4 | Vị trí tuyển dụng | Quản lý vị trí cần tuyển, trạng thái mở/đóng và thông tin đăng tuyển | `Job Opening` |
| 5 | Hồ sơ ứng viên | Nhận và quản lý hồ sơ, CV, nguồn ứng tuyển, người phụ trách, trạng thái trong pipeline | `Job Applicant`; API tiếp nhận hồ sơ trong `duongtest/api.py` |
| 6 | Lịch phỏng vấn | Lên lịch, chọn vòng/phương thức/người phỏng vấn, kiểm tra trùng lịch và theo dõi kết quả | `Interview`, `Interview Round`, `Interviewer Assignment` |
| 7 | Đánh giá phỏng vấn | Nhập điểm/nhận xét theo tiêu chí, kết luận tuyển dụng và giới hạn quyền xem feedback | `Interview Feedback`, `Interview Feedback Criterion` |
| 8 | Thư mời nhận việc | Tạo offer, duyệt, gửi, theo dõi chấp nhận/từ chối/hết hạn; cập nhật trạng thái ứng viên | `Job Offer` |
| 9 | Dashboard và báo cáo | Tổng quan pipeline, feedback còn thiếu, thời gian tuyển dụng, xuất báo cáo | Ba report hiện có: Applicant Pipeline, Pending Feedback, Recruitment Lead Time |
| 10 | Thông báo và lịch sử | Thông báo việc cần xử lý; nhật ký thay đổi và người thực hiện | Xây bổ sung hoặc dùng cơ chế Notification/Comment/Version phù hợp của Frappe |
| 11 | Cổng ứng viên và tích hợp | Ứng viên gửi hồ sơ, tải CV an toàn, tra cứu trạng thái sau xác minh | API công khai có kiểm soát trong `duongtest/api.py`; cần duy trì kiểm tra bảo mật |

### Thứ tự triển khai gợi ý

1. Hoàn chỉnh **phòng ban, vai trò, quyền và cài đặt** vì các luồng khác phụ thuộc chúng.
2. Nối **Yêu cầu tuyển dụng → Vị trí tuyển dụng** và hoàn chỉnh luồng duyệt.
3. Nối **Ứng viên → Phỏng vấn → Feedback → Offer** theo vòng đời một ứng viên.
4. Làm **Dashboard/báo cáo** từ dữ liệu backend thật.
5. Hoàn thiện **thông báo, cổng ứng viên và tích hợp** sau khi các luồng nội bộ ổn định.

Đây là các module theo nghiệp vụ, không nhất thiết là các ứng dụng Frappe riêng. Với repository hiện tại, nên giữ trong app `duongtest` và tách theo DocType/trang/API tương ứng.

## 3. Cấu trúc mã nguồn liên quan

```text
duongtest/
  api.py                              # API nghiệp vụ/điểm tích hợp
  hooks.py                            # Hook quyền, migration và cấu hình app
  permissions.py                     # Quyền truy cập dữ liệu nhạy cảm
  duongtest/doctype/
    job_applicant/
      job_applicant.json              # Schema DocType
      job_applicant.py                # Controller/kiểm tra nghiệp vụ
      job_applicant.js                # Script trên Desk (nếu cần)
      test_job_applicant.py           # Test backend
  report/                             # Định nghĩa các báo cáo Frappe
  www/duongtest.py                    # Trang web và boot/session

frontend/
  index.html                          # Entry HTML và thứ tự nạp script
  src/
    data.js                           # Hiện đang chứa dữ liệu mẫu
    state.js                          # Trạng thái giao diện
    components.js                     # Component/helper UI dùng chung
    router.js                         # Điều hướng và render trang
    actions.js                        # Event handler theo data-action/change/input
    pages/
      applicants.js                   # Trang danh sách/chi tiết ứng viên
      requests.js
      interviews.js
      offers.js
      reports.js
      settings.js
  styles/                             # CSS dùng chung
```

`frontend/index.html` nạp các script theo thứ tự. Khi thêm một file JavaScript mới, phải khai báo nó trong `index.html` ở vị trí sau các phụ thuộc và trước `main.js`; nếu không, trang build có thể không tìm thấy hàm/biến mới.

## 4. Quy trình tạo một module hoàn chỉnh

Ví dụ dưới đây dùng **Quản lý ứng viên**. Tên DocType trong Frappe là `Job Applicant`.

### Bước 1: Chốt yêu cầu và quy tắc nghiệp vụ

Trước khi tạo file, ghi rõ:

- Ai sử dụng module và vai trò nào được xem/tạo/sửa/xóa?
- Trạng thái ứng viên nào được phép chuyển sang trạng thái nào?
- Ứng viên phải liên kết với yêu cầu tuyển dụng/vị trí nào?
- Trường nào bắt buộc, trường nào chứa dữ liệu cá nhân hoặc nhạy cảm?
- CV được tải lên, lưu trữ và tải xuống theo quyền nào?
- Trường hợp trùng email/đã tồn tại xử lý ra sao?
- Các thao tác cần lưu lịch sử hoặc gửi thông báo?

Định nghĩa trạng thái và quyền trước khi làm giao diện để frontend không tự quyết định quy tắc quan trọng.

### Bước 2: Thiết kế dữ liệu

Vẽ quan hệ dữ liệu trước khi viết code. Ví dụ:

```text
Recruitment Request 1 ─── N Job Applicant
Job Applicant       1 ─── N Interview
Job Applicant       1 ─── N Job Offer
Interview           1 ─── N Interview Feedback
```

Tránh lưu lặp dữ liệu có thể lấy qua Link field. Chọn kiểu field phù hợp (Data, Email, Phone, Date, Link, Select, Table, Attach...) và đặt tên field nhất quán, dễ hiểu.

### Bước 3: Tạo DocType và các file backend

Tạo thư mục:

```text
duongtest/duongtest/doctype/job_applicant/
```

Các file thường cần:

1. `job_applicant.json`: khai báo tên DocType, field, quyền, cấu hình danh sách và search field.
2. `job_applicant.py`: controller kế thừa `Document`, kiểm tra dữ liệu và quy tắc trạng thái.
3. `job_applicant.js`: chỉ dùng cho hành vi trên form Desk; không thay thế kiểm tra backend.
4. `test_job_applicant.py`: test các trường hợp đúng/sai và quyền liên quan.
5. `__init__.py`: giữ theo cấu trúc các DocType cùng cấp.

Kiểm tra một DocType tương tự trong `duongtest/duongtest/doctype/` trước khi tạo mới; dùng đúng quy ước và metadata Frappe trong project.

Ví dụ khung controller:

```python
import frappe
from frappe.model.document import Document


class JobApplicant(Document):
    def validate(self):
        self.validate_required_fields()
        self.validate_status_transition()

    def validate_required_fields(self):
        if not self.applicant_name:
            frappe.throw("Vui lòng nhập họ tên ứng viên.")

    def validate_status_transition(self):
        # Kiểm tra chuyển trạng thái trên backend; bổ sung quy tắc của dự án.
        pass
```

Đây là khung minh họa: trước khi dùng, cần thay phần TODO bằng quy tắc đã thống nhất và đối chiếu controller hiện tại để không ghi đè nghiệp vụ đã có.

### Bước 4: Thêm kiểm tra và quyền ở backend

- Dùng `validate()`/các hook của Document cho kiểm tra bắt buộc, trạng thái và liên kết.
- Khai báo quyền trong metadata DocType và/hoặc `permissions.py` khi có dữ liệu nhạy cảm.
- Nếu thêm loại dữ liệu cần bảo vệ, cập nhật `hooks.py` theo mẫu hiện tại.
- Kiểm tra quyền trong backend cho từng thao tác; ẩn nút trên frontend chỉ là trải nghiệm người dùng, không phải cơ chế bảo mật.
- Với CV/tệp đính kèm, kiểm tra quyền đọc/ghi và thiết lập tệp riêng tư. Không tạo URL công khai để tải CV.
- API dùng `@frappe.whitelist` phải kiểm tra danh tính, quyền, kiểu/độ dài dữ liệu, và chỉ trả về trường người gọi được phép xem.
- Không trả stack trace, dữ liệu cá nhân hoặc chi tiết nội bộ trong lỗi gửi cho người dùng.

### Bước 5: Viết test backend trước khi nối giao diện

Trong `test_job_applicant.py`, kiểm tra ít nhất:

- Tạo hồ sơ hợp lệ.
- Thiếu trường bắt buộc, email/điện thoại sai định dạng hoặc dữ liệu vượt giới hạn.
- Link tới yêu cầu tuyển dụng không hợp lệ.
- Chuyển trạng thái không được phép.
- Người không có quyền không được xem/sửa hồ sơ hoặc CV.
- Các trường hợp đặc biệt như hồ sơ trùng, xóa/hủy và dữ liệu rỗng.

Ưu tiên test quy tắc nghiệp vụ qua controller/Document thay vì chỉ test cách gọi hàm nội bộ.

### Bước 6: Tạo lớp truy cập dữ liệu frontend

Không để mỗi trang tự gọi API theo kiểu khác nhau. Khi nối dữ liệu thật, tạo helper/service nhỏ theo quy ước thống nhất, ví dụ:

```text
frontend/src/services/jobApplicants.js
```

Lớp này chịu trách nhiệm:

- Gọi API Frappe hoặc endpoint đã được whitelist.
- Chuẩn hóa tham số phân trang, lọc và sắp xếp.
- Xử lý phản hồi thành công/lỗi nhất quán.
- Không nhúng quyền hoặc quy tắc nghiệp vụ bảo mật chỉ ở frontend.

Dùng API resource của Frappe cho thao tác CRUD thông thường nếu phù hợp; dùng `duongtest/api.py` cho luồng đặc thù, tích hợp hoặc API công khai. Với request ghi, bảo đảm cơ chế CSRF và session của Frappe vẫn được áp dụng.

### Bước 7: Hoàn thiện trang và thao tác

Các trang ứng viên hiện ở `frontend/src/pages/applicants.js`.

1. Thay nguồn dữ liệu mẫu bằng service/API; giữ cấu trúc giao diện hiện tại nếu không có yêu cầu thiết kế mới.
2. Hiển thị các trạng thái loading, không có dữ liệu, lỗi tải dữ liệu và lỗi lưu.
3. Làm rõ lỗi validation tại đúng trường; không hiển thị toast thành công khi server trả lỗi.
4. Thêm thao tác trong `frontend/src/actions.js` (hoặc `CHANGES`/`INPUTS` cho input/change) và nối bằng thuộc tính `data-action`, `data-change` hoặc `data-input`.
5. Cập nhật `frontend/src/state.js` chỉ cho trạng thái giao diện cần giữ như bộ lọc, trang hiện tại hoặc modal; không dùng state frontend làm nguồn dữ liệu chuẩn.
6. Cập nhật điều hướng/quyền hiển thị qua `router.js` và helper quyền đang có.
7. Nếu thêm trang mới, đăng ký trang và nạp script đúng thứ tự trong `frontend/index.html`.
8. Kiểm tra giao diện bàn phím, focus, mobile và thông báo lỗi; tái sử dụng component/CSS sẵn có.

### Bước 8: Nối xuyên suốt với các module khác

Một module ứng viên hoàn chỉnh cần kiểm tra các luồng liên quan:

- Từ `Recruitment Request` hoặc `Job Opening` có thể tạo/nhận hồ sơ ứng viên.
- Từ hồ sơ ứng viên có thể lên lịch `Interview`.
- Kết quả phỏng vấn lấy từ `Interview Feedback`, với quyền xem đúng người.
- Chỉ trạng thái phù hợp mới cho phép tạo `Job Offer`.
- Khi offer được chấp nhận, cập nhật pipeline ứng viên và số liệu báo cáo nhất quán.
- Hủy/xóa dữ liệu không làm mất lịch sử hoặc để lại liên kết mồ côi.

Các cập nhật liên quan nhiều bản ghi nên được thực hiện ở backend theo cách đảm bảo tính nhất quán; không cập nhật nhiều dữ liệu quan trọng riêng trong trình duyệt.

### Bước 9: Chạy kiểm tra và build

Frontend:

```bash
cd frontend
yarn test
yarn typecheck
yarn build
```

Backend (thay `your-site` bằng site Frappe của môi trường):

```bash
bench --site your-site run-tests --app duongtest
bench --site your-site migrate
```

Chạy migrate trên môi trường phát triển trước để Frappe nhận metadata DocType mới/cập nhật. Sau đó kiểm tra bằng tài khoản có từng vai trò, thử cả thao tác được phép và bị từ chối.

### Bước 10: Hoàn tất và bàn giao

- Cập nhật tài liệu/API nếu thay đổi cách sử dụng.
- Kiểm tra `git diff` để không đưa dữ liệu mẫu, log, tệp build không cần thiết hoặc thông tin bí mật vào commit.
- Ghi rõ thay đổi DocType, quyền, API, lệnh migrate và test đã chạy.
- Không coi module hoàn thành nếu chỉ có giao diện; cần có dữ liệu backend, validation, quyền, luồng lỗi và test.

## 5. Checklist hoàn thành module

- [ ] Yêu cầu, trạng thái và vai trò sử dụng được xác định.
- [ ] DocType/schema và quan hệ dữ liệu được thiết kế.
- [ ] Controller kiểm tra dữ liệu và quy tắc nghiệp vụ.
- [ ] Quyền được enforce ở backend; dữ liệu nhạy cảm được bảo vệ.
- [ ] API/service có phản hồi lỗi rõ ràng, không trả dữ liệu vượt quyền.
- [ ] Giao diện đọc/ghi dữ liệu backend thật, không còn phụ thuộc mock cho luồng chính.
- [ ] Có loading, empty, validation error và server error.
- [ ] Các luồng kết nối module khác hoạt động.
- [ ] Test backend, test frontend, typecheck và build đạt.
- [ ] Migrate và kiểm tra thủ công theo nhiều vai trò đã hoàn tất.
