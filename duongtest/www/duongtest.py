# Trang /duongtest: khung HTML của giao diện quản lý tuyển dụng.
# Bản build của frontend chép index.html thành www/duongtest.html; Frappe render nó bằng jinja với context dưới đây.
#
# Đăng nhập/đăng xuất dùng chính của Frappe: trang /login và frappe.handler.logout. Giao diện không có form đăng nhập
# riêng - nó dùng chung phiên (cookie sid) với phần còn lại của site.
from urllib.parse import quote

import frappe
from frappe import _
from frappe.sessions import get_csrf_token

no_cache = 1

LOGIN_PATH = "/login"
LOGOUT_PATH = "/api/method/logout"

# Vai trò mà giao diện biết dựng menu/quyền (frontend/src/components.js: ROLE_NAV), xếp từ quyền cao xuống thấp.
# Giao diện mở theo vai trò đầu tiên mà người dùng thật sự có.
APP_ROLES = [
	"System Manager",
	"General Director",
	"HR Manager",
	"HR Officer",
	"Department Manager",
	"Interviewer",
	"Recruitment Requester",
]


def get_context(context):
	if frappe.session.user == "Guest":
		# Chưa đăng nhập: về trang đăng nhập Frappe, xong quay lại đúng đường dẫn đang mở.
		# 302 (không phải 301 mặc định): chuyển hướng tạm thời, không để proxy/trình duyệt nhớ mãi.
		frappe.local.flags.redirect_location = login_redirect()
		raise frappe.Redirect(302)
	if not app_roles():
		# Đã đăng nhập nhưng không có vai trò nào của hệ thống tuyển dụng: chặn hẳn, không hạ xuống vai trò thấp nhất.
		frappe.throw(
			_("Tài khoản của bạn chưa được cấp vai trò dùng hệ thống tuyển dụng. Liên hệ quản trị viên."),
			frappe.PermissionError,
		)
	context.boot = get_boot()
	return context


def current_path() -> str:
	"""Đường dẫn + query đang mở (không dùng full_path để không phụ thuộc dấu "?" werkzeug thêm vào)."""
	request = frappe.request
	query = request.query_string.decode() if request.query_string else ""
	return f"{request.path}?{query}" if query else request.path


def login_redirect(path: str | None = None) -> str:
	return f"{LOGIN_PATH}?redirect-to={quote(path or current_path(), safe='')}"


def app_roles(user: str | None = None) -> list[str]:
	"""Vai trò của người dùng mà giao diện hiểu, theo thứ tự quyền giảm dần."""
	roles = set(frappe.get_roles(user or frappe.session.user))
	return [role for role in APP_ROLES if role in roles]


def user_info(user: str | None = None) -> dict:
	"""Tài khoản đang đăng nhập cho giao diện (tên, ảnh, vai trò). Không chứa gì bí mật."""
	user = user or frappe.session.user
	full_name, image = frappe.db.get_value("User", user, ["full_name", "user_image"]) or (None, None)
	roles = app_roles(user)
	return {
		"id": user,
		"full_name": full_name or user,
		"image": image or None,
		"roles": roles,
		"role": roles[0] if roles else None,
	}


def get_boot():
	"""Dữ liệu nhúng sẵn vào trang: token CSRF của phiên và tài khoản đang đăng nhập.

	Nhờ vậy giao diện hiện tên người dùng và nút đăng xuất ngay khi tải, không cần chờ API.
	"""
	return frappe._dict(
		{
			"csrf_token": get_csrf_token(),
			"site_name": frappe.local.site,
			"user": user_info(),
			"login_url": LOGIN_PATH,
			"logout_url": LOGOUT_PATH,
		}
	)


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_session_info() -> dict:
	"""Phiên hiện tại, để giao diện kiểm lại khi người dùng quay lại tab.

	allow_guest để giao diện biết phiên đã mất (đăng xuất ở tab khác) thay vì nhận 403 không rõ nguyên nhân.
	"""
	authenticated = frappe.session.user != "Guest"
	return {
		"authenticated": authenticated,
		"user": user_info() if authenticated else None,
		"login_url": LOGIN_PATH,
		"logout_url": LOGOUT_PATH,
	}


@frappe.whitelist(methods=["GET"])
def get_context_for_dev():
	"""Boot cho `yarn dev` (index.html chưa qua jinja). Chỉ dùng khi bật developer_mode."""
	if not frappe.conf.developer_mode:
		frappe.throw(_("This method is only meant for developer mode"))
	return get_boot()
