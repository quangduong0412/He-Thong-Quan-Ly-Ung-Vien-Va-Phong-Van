/// <reference types="vite/client" />

interface Window {
  /** Token CSRF của phiên Frappe, gắn vào trang bởi www/mbw_assistant_mhiring.py (chưa render jinja khi chạy `yarn dev`). */
  csrf_token?: string
}
