/**
 * src/shared.js — Module tiện ích dùng chung giữa Khách hàng (index.html) và Quản trị (admin.html)
 * Đảm bảo 100% tính tương thích về định dạng tiền tệ, ngày giờ, escape, DOM và Toast.
 */

// Selector Helper
export const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);

// Mảng an toàn
export const arr = v => (Array.isArray(v) ? v : []);

// Escape ký tự đặc biệt HTML chống injection
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

// Escape attribute string trong onclick="fn(${q(x)})"
export const q = x => esc(JSON.stringify(String(x ?? '')));

// Tiện ích ẩn phần tử
export const cm = id => {
  const el = $(id);
  if (el) el.classList.add('hidden');
};

export const sm = id => {
  const el = $(id);
  if (el) el.classList.remove('hidden');
};

// Sinh mã ngẫu nhiên
export const genId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(10);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 10; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return "DH" + [...bytes].map(x => chars[x % 36]).join("");
};

export const genHex = n => {
  const bytes = new Uint8Array(Math.ceil(n / 2));
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return [...bytes].map(x => x.toString(16).padStart(2, "0")).join("").slice(0, n);
};

// Chuẩn hóa ID đơn
export const normId = v => String(v || "").trim().toUpperCase().replace(/[-_.\s]/g, "");

// Kiểm tra gói vĩnh viễn
export const isLife = s => /(v[i\u00EC\u00ED\u0129\u0128]nh\s*vi[e\u00EA\u1EC5\u1EC4]n|vinh\s*vien|lifetime|永久)/i.test(String(s || ""));

// Chuẩn hóa trạng thái đơn hàng
export const normSt = s => s === "paid" ? "success" : s === "rejected" ? "failed" : (s || "pending");

// Format số
export const trimNum = v => String(Math.round((Number(v) || 0) * 100) / 100);
export const VND_SEP = ",";
export const fmtVnd = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, VND_SEP);

// Sleep helper
export const sleep = ms => new Promise(r => setTimeout(r, ms));

// Clipboard copy
export function cp(text, customToastMsg) {
  if (!text) return;
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
  const preview = text.length > 25 ? text.slice(0, 25) + "..." : text;
  toast(customToastMsg || `Đã copy: ${preview}`);
}

// SweetAlert2 Toast Helper
export function getToast() {
  if (typeof Swal !== "undefined") {
    return Swal.mixin({
      toast: true,
      position: 'top',
      backdrop: false,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (t) => {
        t.onmouseenter = Swal.stopTimer;
        t.onmouseleave = Swal.resumeTimer;
      }
    });
  }
  return null;
}

export function toast(msg, type = "ok") {
  const ToastInstance = getToast();
  if (!ToastInstance) {
    if (typeof alert !== "undefined") alert(msg);
    return;
  }
  const icon = type === "err" || type === "error" ? "error" : type === "warn" || type === "warning" ? "warning" : "success";
  ToastInstance.fire({ icon, title: msg });
}

export function showToast(msg, type = "success") {
  toast(msg, type);
}

// ==================== XỬ LÝ NGÀY GIỜ & MÚI GIỜ ====================
let currentTz = "Asia/Ho_Chi_Minh";
export function setTimezone(tz) {
  currentTz = tz === "CN" ? "Asia/Shanghai" : "Asia/Ho_Chi_Minh";
}

export function getTz() {
  return currentTz;
}

export function parseAny(v, tzOverride) {
  if (typeof v === "number") return v;
  const s = String(v || "").trim();
  if (!s) return 0;
  
  if (typeof dayjs !== "undefined") {
    const fmts = [
      "D/M/YYYY HH:mm:ss", "D/M/YYYY HH:mm", "D/M/YYYY",
      "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DDTHH:mm",
      "HH:mm D/M/YYYY", "HH:mm:ss D/M/YYYY"
    ];
    try {
      const d = dayjs.tz ? dayjs.tz(s, fmts, tzOverride || currentTz) : dayjs(s);
      if (d && d.isValid()) return d.valueOf();
    } catch (e) {}
  }
  return Date.parse(s) || 0;
}

export function fmtBank(v, tzOverride) {
  const t = parseAny(v, tzOverride);
  if (!t) return v ? String(v) : "—";
  if (typeof dayjs !== "undefined") {
    try {
      const d = dayjs(t);
      return d.tz ? d.tz(tzOverride || currentTz).format("DD/MM/YYYY HH:mm") : d.format("DD/MM/YYYY HH:mm");
    } catch (e) {}
  }
  return new Date(t).toLocaleString("vi-VN");
}

export const oTs = o => Number(o.createdTs) || parseAny(o.date);

// ==================== DARK / LIGHT THEME ====================
export function paintThemeIcon() {
  if (typeof document === "undefined") return;
  const dark = document.documentElement.classList.contains('dark');
  const html = dark ? '<i class="fas fa-sun text-gray-200"></i>' : '<i class="fas fa-moon text-indigo-600"></i>';
  ['themeToggleDesktop', 'themeToggleMobile'].forEach(id => {
    const btn = $(id);
    if (btn) btn.innerHTML = html;
  });
}

export function toggleTheme() {
  if (typeof document === "undefined") return;
  const dark = document.documentElement.classList.toggle('dark');
  try {
    localStorage.setItem('vpn_theme', dark ? 'dark' : 'light');
  } catch (e) {}
  paintThemeIcon();
}

export function initTheme() {
  if (typeof document === "undefined") return;
  try {
    const t = localStorage.getItem('vpn_theme');
    if (t === 'dark' || (!t && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
  paintThemeIcon();
}

// Auto-grow textarea
export function autoGrow(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = (el.scrollHeight + 2) + "px";
}
