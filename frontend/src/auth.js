"use strict";

/* =====================================================================
   0. AUTH — phiên đăng nhập Frappe
   Giao diện không có form đăng nhập riêng: nó dùng chung phiên (cookie sid)
   với site. Trang /duongtest do duongtest/www/duongtest.py dựng:
   khách bị chuyển về /login, còn người đã đăng nhập thì nhận sẵn "boot"
   (token CSRF + tài khoản) nhúng trong trang.
   ===================================================================== */

/** Boot do jinja nhúng vào trang; null khi chạy `yarn dev` (trang chưa qua jinja). */
var BOOT = (function(){
  var raw = window.duongtest_boot;
  if(typeof raw !== 'string' || raw.indexOf('{{') === 0) return null;
  try{
    var value = JSON.parse(raw);
    return (value && typeof value === 'object') ? value : null;
  }catch(e){ return null; }
})();

var LOGIN_PATH  = (BOOT && BOOT.login_url)  || '/login';
var LOGOUT_PATH = (BOOT && BOOT.logout_url) || '/api/method/logout';
var SESSION_URL = '/api/method/duongtest.www.duongtest.get_session_info';
/* Đăng xuất bằng GET (Frappe không kiểm CSRF cho GET) + trả trang xác nhận; chỉ dùng khi POST bị từ chối. */
var WEB_LOGOUT_PATH = '/api/method/web_logout';
var DEV_BOOT_URL = '/api/method/duongtest.www.duongtest.get_context_for_dev';

/** Tài khoản đang đăng nhập {id, full_name, image, roles, role}; null khi chưa biết phiên (`yarn dev`). */
var SESSION = (BOOT && BOOT.user) || null;

/** Frappe kiểm X-Frappe-CSRF-Token cho mọi request ghi (POST/PUT/PATCH/DELETE) của phiên đăng nhập. */
function csrfHeaders(){
  var token = BOOT && BOOT.csrf_token;
  return token ? {'X-Frappe-CSRF-Token': token} : {};
}

/** Trang đăng nhập, quay lại đúng chỗ đang xem sau khi đăng nhập. */
function loginUrl(){
  return LOGIN_PATH + '?redirect-to=' + encodeURIComponent(location.pathname + location.search);
}

/** Vai trò giao diện suy ra từ vai trò Frappe thật; `fallback` dùng khi chưa biết phiên. */
function sessionRole(fallback){
  return (SESSION && SESSION.role) || fallback;
}

/** Người đang đăng nhập, dạng mà header/menu dùng; null khi chưa biết phiên. */
function sessionPerson(){
  if(!SESSION) return null;
  return {key: SESSION.role, user: SESSION.full_name, title: SESSION.id, image: SESSION.image};
}

/** Đang xem bằng một vai trò khác vai trò thật (nút "Đổi vai trò" của bản mẫu). */
function isSimulating(){
  return !!(SESSION && SESSION.role && state.role !== SESSION.role);
}

/**
 * Đăng xuất khỏi Frappe rồi về trang đăng nhập. Tên khác với action ACTIONS.signOut để khỏi lẫn.
 * Dùng POST kèm token CSRF, không dùng GET, để site khác không đăng xuất người dùng được.
 *
 * fetch không "reject" khi server trả lỗi, nên phải tự xét r.ok: nếu token CSRF đã cũ (người dùng đăng nhập lại
 * ở tab khác) thì POST bị từ chối, và nếu cứ về /login thì phiên vẫn còn - /login sẽ đẩy ngược vào app,
 * trông như đăng xuất không ăn. Khi đó chuyển hướng thẳng tới web_logout để chắc chắn phiên bị xoá.
 */
function frappeLogout(){
  var headers = csrfHeaders();
  headers['Accept'] = 'application/json';
  return fetch(LOGOUT_PATH, {method:'POST', credentials:'same-origin', headers: headers})
    .then(function(r){
      if(r.ok) location.replace(LOGIN_PATH);
      else location.href = WEB_LOGOUT_PATH;
    })
    .catch(function(){ location.href = WEB_LOGOUT_PATH; });
}

/** Đọc lại phiên từ server (null nếu không gọi được). */
function fetchSession(){
  return fetch(SESSION_URL, {credentials:'same-origin', headers:{'Accept':'application/json'}})
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(body){ return (body && body.message) || null; })
    .catch(function(){ return null; });
}

/**
 * Quay lại tab: nếu đã đăng xuất hoặc đổi tài khoản ở tab khác thì tải lại trang
 * (trang jinja sẽ chuyển về /login hoặc cấp token CSRF mới). Tối đa một lần mỗi 30 giây.
 */
function watchSession(){
  var last = 0, running = false;
  function check(){
    var now = Date.now();
    if(running || now - last < 30000) return;
    last = now; running = true;
    fetchSession().then(function(info){
      running = false;
      if(!info) return;
      if(!info.authenticated || (SESSION && info.user && info.user.id !== SESSION.id)) location.reload();
    });
  }
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible') check();
  });
}

/** `yarn dev`: trang chưa qua jinja nên hỏi backend lấy boot, rồi vẽ lại header. */
function loadDevSession(){
  if(SESSION) return Promise.resolve();
  return fetch(DEV_BOOT_URL, {credentials:'same-origin', headers:{'Accept':'application/json'}})
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(body){
      var boot = body && body.message;
      if(!boot) return;
      BOOT = boot;
      SESSION = boot.user || null;
      LOGIN_PATH  = boot.login_url  || LOGIN_PATH;
      LOGOUT_PATH = boot.logout_url || LOGOUT_PATH;
      if(SESSION && SESSION.role) state.role = SESSION.role;
    })
    .catch(function(){ /* chưa đăng nhập ở cổng dev: giữ người mẫu của bản prototype */ });
}
