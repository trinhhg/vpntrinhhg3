/**
 * src/api.js — Module giao tiếp API tập trung duy nhất của VPNTrinhHg3
 * Tuân thủ 100% hợp đồng API của Worker Backend và các quy tắc an toàn AGENTS.md
 */

export const WORKER_URL = "https://vpntrinhhg3worker.lucastanora.workers.dev";

export function getSiteKey() {
  return typeof location !== "undefined" ? location.hostname.replace(/\./g, "_") : "vpntrinhhg";
}

let onUnauthorizedCallback = null;
export function setOnUnauthorized(cb) {
  onUnauthorizedCallback = cb;
}

export function getAdminToken() {
  if (typeof localStorage === "undefined") return "";
  const key = getSiteKey() + "_tok";
  return localStorage.getItem(key) || "";
}

export function setAdminToken(token) {
  if (typeof localStorage === "undefined") return;
  const key = getSiteKey() + "_tok";
  if (token) {
    localStorage.setItem(key, token);
  } else {
    localStorage.removeItem(key);
  }
}

export function clearAdminToken() {
  setAdminToken("");
}

export function isTestMode() {
  if (typeof location === "undefined") return false;
  return new URLSearchParams(location.search).get("test") === "1";
}

/**
 * Universal Request Helper
 */
export async function request(path, options = {}) {
  const isAbs = /^https?:\/\//i.test(path);
  let urlStr = isAbs ? path : `${WORKER_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  
  if (isTestMode()) {
    urlStr += (urlStr.includes('?') ? '&' : '?') + 'test=1';
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (isTestMode()) {
    headers['X-Test-Mode'] = '1';
  }

  const token = options.token || getAdminToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const timeoutMs = options.timeout || 25000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
    body = JSON.stringify(body);
  }

  try {
    const res = await fetch(urlStr, {
      method: options.method || 'GET',
      headers,
      body,
      cache: options.cache || 'no-store',
      signal: controller.signal
    });

    clearTimeout(timer);

    if (res.status === 401 && !options.noRedirect) {
      if (typeof onUnauthorizedCallback === 'function') {
        onUnauthorizedCallback();
      }
    }

    return res;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(`Yêu cầu mạng quá thời gian (${timeoutMs / 1000}s)`);
    }
    throw err;
  }
}

/**
 * Customer wpost Helper
 * Trả về đúng object contract cũ: { ok: boolean, status: number, data: object }
 */
export async function wpost(path, body) {
  try {
    const res = await request(path, {
      method: 'POST',
      body,
      noRedirect: true
    });
    let data = {};
    try { data = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: err.message || String(err) } };
  }
}

/**
 * Customer wpostRetry Helper
 * QUY TẮC AN TOÀN 41 & 8.3: Không tự động retry mù quáng cho POST tạo đơn hoặc nâng cấp
 * để tránh phát sinh giao dịch thứ hai khi mạng rớt sau khi backend đã xử lý xong.
 */
export async function wpostRetry(path, body, n = 3) {
  const isOrderCreation = path.includes('/api/public/order') || path.includes('/api/public/upgrade');
  const attempts = isOrderCreation ? 1 : n;

  let last = { ok: false, status: 0, data: {} };
  for (let i = 0; i < attempts; i++) {
    try {
      last = await wpost(path, body);
      if (last.ok || (last.status > 0 && last.status < 500)) {
        return last;
      }
    } catch (e) {
      last = { ok: false, status: 0, data: { error: String(e) } };
    }
    if (i < attempts - 1) {
      await new Promise(r => setTimeout(r, 800 * (i + 1)));
    }
  }
  return last;
}

/**
 * Admin api() Helper
 * Giữ nguyên 100% hợp đồng với admin.html cũ
 */
export async function api(path, opts = {}) {
  return request(path, opts);
}

/**
 * Admin aj() Helper
 * JSON API caller kèm xử lý lỗi và soft-fail flag
 */
export async function aj(path, opts = {}) {
  const res = await api(path, opts);
  let json = null;
  try { json = await res.json(); } catch {}
  if (!res.ok && !opts.soft) {
    const errMsg = (json && (json.error || json.message)) || (`HTTP ${res.status}`);
    throw new Error(errMsg);
  }
  return json;
}
