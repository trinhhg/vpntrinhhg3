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

// ==================== STACKED TOAST NOTIFICATIONS (TOP-RIGHT BELOW HEADER) ====================
let toastOffsetListenerBound = false;
function calcToastTopOffset() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return 16;
  let bottom = 0;
  ['#headerAnnouncementDrawer', '#siteAnnouncementBanner', '#mainNav', '#hdr', '#tabBar'].forEach((sel) => {
    const el = document.querySelector(sel);
    if (!el || el.classList.contains('hidden') || el.classList.contains('nav-hidden')) return;
    const st = window.getComputedStyle ? window.getComputedStyle(el) : null;
    if (st && (st.display === 'none' || st.visibility === 'hidden')) return;
    const rect = el.getBoundingClientRect();
    if (rect && rect.height > 0 && rect.bottom > bottom) bottom = rect.bottom;
  });
  const top = bottom > 0 ? Math.ceil(bottom + 8) : 16;
  return Math.min(top, Math.max(16, Math.floor((window.innerHeight || 640) * 0.45)));
}

function syncToastTopPosition() {
  if (typeof document === 'undefined') return;
  const topPx = calcToastTopOffset();
  document.documentElement.style.setProperty('--toast-top-offset', topPx + 'px');
  const c = document.getElementById('toastStackContainer');
  if (c) c.style.top = topPx + 'px';
}

function ensureToastContainer() {
  let c = document.getElementById('toastStackContainer');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toastStackContainer';
    c.setAttribute('role', 'status');
    c.setAttribute('aria-live', 'polite');
    c.setAttribute('aria-atomic', 'false');
    c.className = 'fixed right-3 sm:right-4 z-[999999] flex flex-col gap-2 pointer-events-none items-end max-w-[calc(100vw-1.5rem)] sm:max-w-sm';
    document.body.appendChild(c);
  }
  syncToastTopPosition();
  if (!toastOffsetListenerBound && typeof window !== 'undefined') {
    toastOffsetListenerBound = true;
    window.addEventListener('resize', syncToastTopPosition, { passive: true });
    window.addEventListener('scroll', syncToastTopPosition, { passive: true });
  }
  return c;
}

export function toast(msg, type = 'ok') {
  if (typeof document === 'undefined') return;
  const c = ensureToastContainer();
  syncToastTopPosition();
  const el = document.createElement('div');

  const isErr = type === 'err' || type === 'error';
  const isWarn = type === 'warn' || type === 'warning';
  const isInfo = type === 'info';

  const iconClass = isErr ? 'fa-circle-xmark text-red-500' : isWarn ? 'fa-triangle-exclamation text-amber-500' : isInfo ? 'fa-circle-info text-blue-500' : 'fa-circle-check text-emerald-500';
  const borderClass = isErr ? 'border-red-200 dark:border-red-900/60' : isWarn ? 'border-amber-200 dark:border-amber-900/60' : isInfo ? 'border-blue-200 dark:border-blue-900/60' : 'border-emerald-200 dark:border-emerald-900/60';

  el.className = 'pointer-events-auto inline-flex items-center gap-2 py-2 px-3 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border ' + borderClass + ' text-slate-800 dark:text-slate-100 text-xs sm:text-[13px] font-semibold transition-all duration-300 transform translate-x-4 opacity-0 ml-auto';
  el.style.cssText = 'width: fit-content !important; max-width: calc(100vw - 1.5rem); display: inline-flex !important; align-items: center !important;';

  el.innerHTML = '<i class="fas ' + iconClass + ' text-sm shrink-0 flex items-center justify-center" aria-hidden="true"></i>' + '<div class="leading-snug break-words whitespace-normal flex items-center">' + msg + '</div>' + '<button type="button" class="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white ml-1 shrink-0 w-6 h-6 rounded-md inline-flex items-center justify-center transition" aria-label="Đóng thông báo">' + '<i class="fas fa-times text-[11px]" aria-hidden="true"></i>' + '</button>';

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
  el.onmouseleave = () => {
    timer = setTimeout(dismiss, 2000);
  };
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
    const fmts = ["D/M/YYYY HH:mm:ss", "D/M/YYYY HH:mm", "D/M/YYYY", "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DDTHH:mm", "HH:mm D/M/YYYY", "HH:mm:ss D/M/YYYY"];
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

// ==================== VAUL SHEET PHYSICS & DIALOG A11Y ====================
export function bindVaulDialog(overlayId, options = {}) {
  if (typeof document === "undefined") return;
  const overlay = $(overlayId);
  if (!overlay || overlay.dataset.vaulBound === "1") return;
  overlay.dataset.vaulBound = "1";

  const {
    handleId = "",
    closeFn = null,
    breakpointPx = 768,
    scrollableSelector = ""
  } = options;
  const handle = handleId ? $(handleId) : null;
  const sheet = (handle && handle.parentElement) || overlay.querySelector(".glass-card") || overlay.firstElementChild;
  if (!sheet) return;

  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const dragTarget = handle || sheet;
  let startY = 0;
  let currentY = 0;
  let dragging = false;
  let activePointerId = null;

  const isReducedMotion = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canStartAt = (target) => {
    if (typeof window !== "undefined" && window.innerWidth >= breakpointPx) return false;
    if (!handle && target && target.closest && target.closest("button, a, input, textarea, select, [role='button']")) return false;
    if (scrollableSelector && target && target.closest) {
      const scrollable = target.closest(scrollableSelector);
      if (scrollable && scrollable.scrollTop > 0) return false;
    }
    if (!handle && sheet.scrollTop > 0) return false;
    return true;
  };

  const beginDrag = (clientY) => {
    startY = clientY;
    currentY = clientY;
    dragging = true;
    sheet.style.transition = "none";
  };

  const moveDrag = (clientY) => {
    if (!dragging) return;
    currentY = clientY;
    const deltaY = currentY - startY;
    if (deltaY > 0) {
      sheet.style.transform = `translateY(${deltaY}px)`;
    } else {
      sheet.style.transform = "translateY(0)";
    }
  };

  const finishDrag = (cancelled = false) => {
    if (!dragging) return;
    dragging = false;
    activePointerId = null;
    const deltaY = cancelled ? 0 : (currentY - startY);
    sheet.style.transition = isReducedMotion() ? "none" : "transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)";
    if (!cancelled && deltaY > 96) {
      sheet.style.transform = "translateY(100%)";
      const finishDelay = isReducedMotion() ? 0 : 200;
      setTimeout(() => {
        if (typeof closeFn === "function") closeFn();
        else overlay.classList.add("hidden");
        sheet.style.transform = "";
      }, finishDelay);
    } else {
      sheet.style.transform = deltaY > 0 ? "translateY(0)" : "";
    }
  };

  // Support both Pointer Events and Touch Events cleanly without double-firing
  if (typeof window !== "undefined" && "PointerEvent" in window) {
    dragTarget.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") return;
      if (!canStartAt(e.target)) return;
      activePointerId = e.pointerId;
      beginDrag(e.clientY);
    }, { passive: true });
    window.addEventListener("pointermove", (e) => {
      if (dragging && e.pointerId === activePointerId) moveDrag(e.clientY);
    }, { passive: true });
    window.addEventListener("pointerup", (e) => {
      if (dragging && e.pointerId === activePointerId) finishDrag(false);
    }, { passive: true });
    window.addEventListener("pointercancel", (e) => {
      if (dragging && e.pointerId === activePointerId) finishDrag(true);
    }, { passive: true });
  }

  dragTarget.addEventListener("touchstart", (e) => {
    if (dragging) return;
    if (!canStartAt(e.target)) return;
    if (e.touches && e.touches[0]) beginDrag(e.touches[0].clientY);
  }, { passive: true });
  dragTarget.addEventListener("touchmove", (e) => {
    if (!dragging || activePointerId !== null) return;
    if (e.touches && e.touches[0]) moveDrag(e.touches[0].clientY);
  }, { passive: true });
  dragTarget.addEventListener("touchend", () => {
    if (!dragging || activePointerId !== null) return;
    finishDrag(false);
  }, { passive: true });
  dragTarget.addEventListener("touchcancel", () => {
    if (!dragging || activePointerId !== null) return;
    finishDrag(true);
  }, { passive: true });
}
