/**
 * src/shared.js — Module tiện ích dùng chung giữa Khách hàng (index.html) và Quản trị (admin.html)
 * Đảm bảo 100% tính tương thích về định dạng tiền tệ, ngày giờ, escape, DOM và Toast.
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export { dayjs };

const getStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch (e) {}
  return null;
};

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

// ==================== STACKED TOAST NOTIFICATIONS (TOP-RIGHT) ====================
function ensureToastContainer() {
  let c = document.getElementById('toastStackContainer');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toastStackContainer';
    c.className = 'fixed top-4 right-4 z-[999999] flex flex-col gap-2 max-w-[340px] w-full pointer-events-none px-3 sm:px-0';
    document.body.appendChild(c);
  }
  return c;
}

export function toast(msg, type = 'ok') {
  if (typeof document === 'undefined') return;
  const c = ensureToastContainer();
  const el = document.createElement('div');
  
  const isErr = type === 'err' || type === 'error';
  const isWarn = type === 'warn' || type === 'warning';
  const isInfo = type === 'info';
  
  const iconClass = isErr ? 'fa-circle-xmark text-red-500' : isWarn ? 'fa-triangle-exclamation text-amber-500' : isInfo ? 'fa-circle-info text-blue-500' : 'fa-circle-check text-green-500';
  const borderClass = isErr ? 'border-red-200 dark:border-red-900/60' : isWarn ? 'border-amber-200 dark:border-amber-900/60' : isInfo ? 'border-blue-200 dark:border-blue-900/60' : 'border-green-200 dark:border-green-900/60';
  
  el.className = 'pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border ' + borderClass + ' text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-medium transition-all duration-300 transform translate-x-4 opacity-0';
  
  el.innerHTML = '<i class="fas ' + iconClass + ' text-base mt-0.5 shrink-0"></i>' +
    '<div class="flex-1 leading-snug break-words">' + msg + '</div>' +
    '<button type="button" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1 shrink-0 p-0.5" aria-label="Close">' +
      '<i class="fas fa-times text-xs"></i>' +
    '</button>';
  
  const closeBtn = el.querySelector('button');
  const dismiss = () => {
    el.classList.add('opacity-0', 'translate-x-4');
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300);
  };
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    dismiss();
  };
  
  c.appendChild(el);
  requestAnimationFrame(() => {
    el.classList.remove('opacity-0', 'translate-x-4');
    el.classList.add('opacity-100', 'translate-x-0');
  });
  
  let timer = setTimeout(dismiss, 3500);
  el.onmouseenter = () => clearTimeout(timer);
  el.onmouseleave = () => { timer = setTimeout(dismiss, 2000); };
}

export function showToast(msg, type = 'success') {
  toast(msg, type);
}

export function getToast() {
  return { fire: ({ icon, title }) => toast(title, icon) };
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
    getStorage()?.setItem('vpn_theme', dark ? 'dark' : 'light');
  } catch (e) {}
  paintThemeIcon();
}

export function initTheme() {
  if (typeof document === "undefined") return;
  try {
    const t = getStorage()?.getItem('vpn_theme');
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
