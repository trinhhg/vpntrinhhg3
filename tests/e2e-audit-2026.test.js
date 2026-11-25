import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const readSrc = rel => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

function setupBrowserEnv() {
  if (!globalThis.fetch) {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  }
  window.matchMedia = vi.fn().mockImplementation(q => ({
    matches: false,
    media: q,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
  Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
  window.scrollTo = vi.fn((a, b) => {
    const top = typeof a === 'object' && a !== null ? (a.top ?? 0) : (b ?? 0);
    window.scrollY = top;
  });
  Element.prototype.scrollIntoView = vi.fn();
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: [] })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => []),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn()
  }));
}

describe('E2E Audit & Fixes 2026 — Customer (Index)', () => {
  beforeEach(() => {
    setupBrowserEnv();
    const html = readSrc('index.html');
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    document.body.innerHTML = (bodyMatch ? bodyMatch[1] : html).replace(/<script[\s\S]*?<\/script>/gi, '');
    localStorage.clear();
    sessionStorage.clear();
  });

  it('Bug #1: Checkout #needSupport luôn bật mặc định khi mở mới và khi reset form đổi gói', async () => {
    const mod = await import('../src/customer.js');
    expect(typeof mod.openCheckout).toBe('function');
    expect(typeof mod.toggleZalo).toBe('function');

    const pkg1 = { id: 'p1m', name: 'Gói 1 Tháng', vnd: 15000, cny: 5, time: 1, data: '1000GB/tháng', dev: 'unlimited', category: ['cycle'] };
    const pkg2 = { id: 'p3m', name: 'Gói 3 Tháng', vnd: 40000, cny: 12, time: 3, data: '1000GB/tháng', dev: 'unlimited', category: ['cycle'] };

    const cb = document.getElementById('needSupport');
    const zalo = document.getElementById('cusZalo');
    expect(cb).toBeTruthy();
    expect(zalo).toBeTruthy();

    mod.openCheckout('p1m', [pkg1, pkg2]);
    expect(cb.checked).toBe(true);
    expect(zalo.classList.contains('hidden')).toBe(false);
    expect(zalo.disabled).toBe(false);

    // User manually unchecks
    cb.checked = false;
    mod.toggleZalo();
    expect(zalo.classList.contains('hidden')).toBe(true);

    // Switching to another package resets form -> #needSupport must default back to checked = true
    mod.openCheckout('p3m', [pkg1, pkg2]);
    expect(cb.checked).toBe(true);
    expect(zalo.classList.contains('hidden')).toBe(false);
    expect(zalo.disabled).toBe(false);
  });

  it('Bug #2: Chuẩn hóa tên gói tiếng Anh (không gạch ngang / U+2011) và dịch dung lượng/ngày EN & ZH', async () => {
    const mod = await import('../src/customer.js');
    expect(typeof mod.normalizeTrString).toBe('function');
    expect(typeof mod.formatPkgDataLabel).toBe('function');

    expect(mod.normalizeTrString('1\u2011Month Plan')).toBe('1 Month Plan');
    expect(mod.normalizeTrString('1-Year Plan')).toBe('1 Year Plan');
    expect(mod.normalizeTrString('3\u2013Months Plan')).toBe('3 Months Plan');
    expect(mod.normalizeTrString('<s>1 Month Plan</s>')).toBe('1 Month Plan');

    expect(mod.formatPkgDataLabel('1000GB/tháng', 'en')).toBe('1000GB/month');
    expect(mod.formatPkgDataLabel('1000GB/tháng', 'zh')).toBe('1000GB/月');
    expect(mod.formatPkgDataLabel('Không giới hạn', 'en')).toBe('Unlimited');

    await mod.changeLanguage('en');
    const stalePkg = { id: 'p1m', name: 'Gói 1 Tháng', vi: { name: 'Gói 1 Tháng' }, en: { name: 'Gói 1 Tháng' }, zh: { name: 'Gói 1 Tháng' } };
    expect(mod.resolvePkgDisplayName(stalePkg, 'en')).toBe('1 Month Plan');
    await mod.changeLanguage('zh');
    expect(mod.resolvePkgDisplayName(stalePkg, 'zh')).toBe('1个月套餐');
    await mod.changeLanguage('vi');
  });

  it('Bug #3: Forward route mới luôn cuộn về scrollY = 0; Back (popstate) mới khôi phục scroll cũ', async () => {
    const mod = await import('../src/customer.js');
    expect(typeof mod.applyRouteScroll).toBe('function');
    expect(typeof mod.recordRouteScroll).toBe('function');
    expect(typeof mod.getNormRouteKey).toBe('function');

    expect(mod.getNormRouteKey('/policy/terms?utm=1')).toBe('/policy/terms');
    window.scrollY = 850;
    mod.recordRouteScroll('/');

    // Forward navigation to a new slug -> MUST reset scroll to 0
    mod.applyRouteScroll('/guide/windows', false);
    expect(window.scrollY).toBe(0);

    // User scrolls down inside /guide/windows, navigates forward to article -> 0
    window.scrollY = 420;
    mod.recordRouteScroll('/guide/windows');
    mod.applyRouteScroll('/guide/windows/flclash', false);
    expect(window.scrollY).toBe(0);

    // Popstate Back to /guide/windows -> MUST restore 420
    mod.applyRouteScroll('/guide/windows', true);
    expect(window.scrollY).toBe(420);

    // Popstate Back to / -> MUST restore 850
    mod.applyRouteScroll('/', true);
    expect(window.scrollY).toBe(850);
  });
});

describe('E2E Audit & Fixes 2026 — Admin Navigation, Sub-tabs, Modals & CMS', () => {
  beforeEach(() => {
    setupBrowserEnv();
    const html = readSrc('admin.html');
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    document.body.innerHTML = (bodyMatch ? bodyMatch[1] : html).replace(/<script[\s\S]*?<\/script>/gi, '');
    localStorage.clear();
    sessionStorage.clear();
  });

  it('Bug #4: Lưu & khôi phục sub-tab đang chọn của từng tab chính và coi #t-more là tab chính khi vuốt mobile', async () => {
    const mod = await import('../src/admin.js');
    expect(Array.isArray(mod.MOBILE_MAIN_TABS)).toBe(true);
    expect(mod.MOBILE_MAIN_TABS).toEqual(['t-ord', 't-lnk', 't-check', 't-trans', 't-more']);
    expect(typeof mod.getAdminSwipeTargetTab).toBe('function');

    // Swipe across mobile bottom nav including #t-more
    expect(mod.getAdminSwipeTargetTab('t-trans', 'left')).toBe('t-more');
    expect(mod.getAdminSwipeTargetTab('t-more', 'right')).toBe('t-trans');

    // Sub-tab persistence across main tab switch
    mod.switchCheckSubTab('heal');
    mod.switchTxTab('raw');
    mod.switchSettingsTab('webadmin');
    mod.switchWebAdminTab('footer');

    // Switch away to t-ord and back -> must stay on heal / raw / webadmin+footer
    mod.go('t-ord');
    mod.go('t-check');
    expect(document.getElementById('btn-chk-heal')?.classList.contains('active')).toBe(true);
    expect(document.getElementById('check-pane-heal')?.classList.contains('hidden')).toBe(false);

    mod.go('t-trans');
    expect(document.getElementById('tx-raw')?.classList.contains('active')).toBe(true);

    mod.go('t-settings');
    expect(document.getElementById('stab-webadmin')?.classList.contains('active')).toBe(true);
    expect(document.getElementById('wtab-footer')?.classList.contains('active')).toBe(true);
  });

  it('Bug #5: Modal #mOrd đặt 3 trạng thái #upgChecks thành 1 hàng riêng 3 cột dưới tiêu đề trên Mobile', () => {
    const adminHtml = readSrc('admin.html');
    const adminJs = readSrc('src/admin.js');
    expect(adminHtml).toContain('id="upgChecks"');
    // Must not keep max-w-[60%] squeezed beside title on mobile
    expect(adminHtml).not.toMatch(/id="upgChecks"[^>]*max-w-\[60%\]/);
    expect(adminHtml).toMatch(/flex-col sm:flex-row[\s\S]{0,400}id="upgChecks"/);
    expect(adminJs).toContain('grid-cols-3');
  });

  it('Bug #6: Modal #mLnk đưa #mLEExpSyncHint ra ngoài grid 2 cột để hiển thị full chiều ngang', () => {
    const adminHtml = readSrc('admin.html');
    const mLnkMatch = adminHtml.match(/id="mLnk"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
    expect(mLnkMatch).toBeTruthy();
    // Hint must sit AFTER the 2-column grid closing tag (outside the HSD narrow column)
    expect(adminHtml).toMatch(/id="mLIdx"[\s\S]*?<\/div>\s*<\/div>\s*<div id="mLEExpSyncHint"/);
  });

  it('Bug #7 & #8: Admin CSS .scrollbar-none, đồng hồ Thời gian mobile gọn và #t-cms sticky action + KV save', () => {
    const adminCss = readSrc('src/admin.css');
    const adminHtml = readSrc('admin.html');
    const adminJs = readSrc('src/admin.js');

    expect(adminCss).toContain('.scrollbar-none');
    expect(adminCss).toContain('.cms-sticky-bar');
    expect(adminHtml).toMatch(/id="clkVN"[^>]*text-\[11px\] sm:text-base/);
    expect(adminHtml).toMatch(/id="clkCN"[^>]*text-\[11px\] sm:text-base/);
    expect(adminJs).toContain('cmsPersistGuideTabs');
  });

  it('Runtime DOM verification: Bug #5 (#mOrd 3-col), Bug #6 (#mLEExpSyncHint) & Admin Back (#t-more)', async () => {
    const mod = await import('../src/admin.js');
    window.ordersDb = [{ id: 'DH2G58BSWNML', email: 'test@example.com', pkgId: 'p1m', status: 'success', days: 30, expDate: '25/12/2026', method: 'Ngân hàng VN' }];
    mod.openOrdModal('DH2G58BSWNML');
    const upgChecks = document.getElementById('upgChecks');
    expect(upgChecks?.querySelectorAll('label').length).toBe(3);
    expect(upgChecks?.innerHTML).toContain('whitespace-nowrap');

    // Bug #4 deeper check: open t-more -> t-cms -> adminBackFromDeepTab() returns cleanly to t-more
    mod.go('t-more');
    mod.go('t-cms');
    expect(document.getElementById('hdrBackBtn')?.classList.contains('hidden')).toBe(false);
    mod.go('t-more');
    expect(document.getElementById('bnav-t-more')?.classList.contains('active')).toBe(true);
  });
});
