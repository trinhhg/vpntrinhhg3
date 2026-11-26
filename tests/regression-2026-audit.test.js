import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const readSrc = rel => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

function setupDomFromFile(rel) {
  const html = readSrc(rel);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  document.body.innerHTML = (bodyMatch ? bodyMatch[1] : html).replace(/<script[\s\S]*?<\/script>/gi, '');
}

function setupBrowserEnv() {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      ok: true,
      packages: [
        { id: 'p1m', name: 'Gói 1 Tháng', en: { name: '1 Month Plan' }, zh: { name: '1个月套餐' }, vnd: 60000, cny: 15, time: 1, data: '1000GB/tháng', dev: 'unlimited', category: ['cycle'] },
      ],
      coupons: [
        { code: 'MIN100', type: 'fixed', value: 10000, minSpend: 100000, endDate: '2026-12-31', enabled: true },
      ],
    }),
  });
  window.matchMedia = vi.fn().mockImplementation(q => ({
    matches: false,
    media: q,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
  window.scrollTo = vi.fn((a, b) => {
    const top = typeof a === 'object' && a !== null ? (a.top ?? 0) : (b ?? 0);
    window.scrollY = top;
  });
  Element.prototype.scrollIntoView = vi.fn(function () {
    if (this && (this.id === 'policy-disclaimer' || this.id === 'policy-refund')) {
      window.scrollY = 480;
    }
  });
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(), clearRect: vi.fn(), getImageData: vi.fn(() => ({ data: [] })),
    putImageData: vi.fn(), createImageData: vi.fn(() => []), setTransform: vi.fn(),
    drawImage: vi.fn(), save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), stroke: vi.fn(),
    translate: vi.fn(), scale: vi.fn(), rotate: vi.fn(), arc: vi.fn(), fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })), transform: vi.fn(), rect: vi.fn(), clip: vi.fn(),
  }));
}

describe('2026 Audit Regression — Customer Index & Portal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupBrowserEnv();
    setupDomFromFile('index.html');
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC-09: Forward nav to /policy/terms, /policy/disclaimer, /policy/refund stays at scrollY === 0 at 0ms and 350ms', async () => {
    const mod = await import('../src/customer.js');
    window.scrollY = 1800;
    mod.recordRouteScroll('/');
    for (const slug of ['terms', 'disclaimer', 'refund']) {
      window.scrollY = 1800;
      mod.showPolicyPage(slug, false);
      expect(window.scrollY).toBe(0);
      vi.advanceTimersByTime(350);
      expect(window.scrollY).toBe(0);
    }
  });

  it('TC-06: Switching package after choosing Alipay resets both #payMethod AND .pay-btn active styling', async () => {
    const mod = await import('../src/customer.js');
    const pkg1 = { id: 'p1m', name: 'Gói 1 Tháng', vnd: 60000, cny: 15, time: 1, data: '1000GB/tháng', dev: 'unlimited', category: ['cycle'] };
    const pkg2 = { id: 'p3m', name: 'Gói 3 Tháng', vnd: 150000, cny: 38, time: 3, data: '1000GB/tháng', dev: 'unlimited', category: ['cycle'] };

    mod.openCheckout('p1m', [pkg1, pkg2]);
    mod.selectPayMethod('alipay');
    expect(document.getElementById('payMethod').value).toBe('alipay');
    expect(document.getElementById('pay-btn-alipay').classList.contains('active')).toBe(true);

    mod.openCheckout('p3m', [pkg1, pkg2]);
    expect(document.getElementById('payMethod').value).toBe('bank');
    expect(document.getElementById('pay-btn-bank').classList.contains('active')).toBe(true);
    expect(document.getElementById('pay-btn-alipay').classList.contains('active')).toBe(false);
    expect(document.getElementById('pay-btn-alipay').classList.contains('border-indigo-500')).toBe(false);
  });

  it('TC-04 & TC-09 CSS & TC-11 Portal normSt: FAQ markup, Footer CSS scope, Rejected order state', async () => {
    const customerJs = readSrc('src/customer.js');
    const customerCss = readSrc('src/customer.css');

    // FAQ <details> must not hijack clicks inside <p> answer
    expect(customerJs).not.toContain('onclick="event.preventDefault();this.open=!this.open;"');
    // Footer 36px height rule must scope strictly to .footer-support-btns, not #footerDynCols a
    expect(customerCss).not.toMatch(/#footerArea a\s*\{[^}]*height:\s*36px/);
    expect(customerCss).toContain('.footer-support-btns');

    // Rejected order must show #portalContentFailed, not #portalContentSuccess
    const mod = await import('../src/customer.js');
    mod.updatePortalInfo({ id: 'DH1234567890', status: 'rejected', method: 'Alipay', serverTime: Date.now() });
    expect(document.getElementById('portalContentFailed').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('portalContentSuccess').classList.contains('hidden')).toBe(true);
  });

  it('TC-02: Feature #2, Footer links & EN/ZH i18n coverage + loadConfig preserves p.en.name', async () => {
    const mod = await import('../src/customer.js');
    expect(mod.normalizeTrString('3 Months')).toBe('3 Months');
    expect(mod.tx('Cài đặt Android', 'en')).not.toBe('Cài đặt Android');
    expect(mod.tx('Miễn trừ trách nhiệm', 'en')).not.toBe('Miễn trừ trách nhiệm');
    expect(mod.tx('Đường truyền ổn định, tối ưu mượt mà cho mạng xã hội & Stream video chuẩn 4K.', 'en')).not.toBe('Đường truyền ổn định, tối ưu mượt mà cho mạng xã hội & Stream video chuẩn 4K.');
    expect(mod.tx('Cài đặt iOS (iPhone/iPad)', 'en')).toBe('iOS Setup (iPhone/iPad)');
    expect(mod.tx('Lưu ý cho Tiktok', 'en')).toBe('TikTok Usage Notes');
    expect(mod.tx('Cài đặt Android', 'zh')).not.toBe('Cài đặt Android');
    expect(mod.tx('Cài đặt iOS (iPhone/iPad)', 'zh')).not.toBe('Cài đặt iOS (iPhone/iPad)');
    expect(mod.tx('Lưu ý cho Tiktok', 'zh')).not.toBe('Lưu ý cho Tiktok');
  });
});

describe('2026 Audit Regression — Admin Panel & Worker Contracts', () => {
  beforeEach(() => {
    setupBrowserEnv();
    setupDomFromFile('admin.html');
    localStorage.clear();
    sessionStorage.clear();
  });

  it('TC-A13: applyPoll preserves existing window.history.state (tab/modal) instead of wiping to {}', async () => {
    const mod = await import('../src/admin.js');
    expect(typeof mod.applyPoll).toBe('function');
    window.history.replaceState({ tab: 't-check', checkSub: 'heal', modal: 'mLnk' }, '', '#check');
    mod.applyPoll({ ok: true, isTest: false, orders: [], links: [], pool: [], data_requests: [] });
    expect(window.history.state).toEqual({ tab: 't-check', checkSub: 'heal', modal: 'mLnk' });
  });

  it('TC-A09: CMS article FAQ updater works without curArtFaqs ReferenceError & DOMPurify strips onclick', async () => {
    const mod = await import('../src/admin.js');
    expect(typeof mod.cmsUpdateArtFaq).toBe('function');
    expect(typeof window.cmsUpdateArtFaq).toBe('function');
    const adminJs = readSrc('src/admin.js');
    expect(adminJs).not.toMatch(/ADD_ATTR:[^\n]*'onclick'/);
    expect(adminJs).not.toContain('oninput="curArtFaqs[');
  });

  it('TC-A12 & TC-A01 & TC-A02: Admin URL route IDs match, TZ card avoids UTC truncation, status row adapts at 360px', () => {
    const adminHtml = readSrc('admin.html');
    expect(adminHtml).toContain('id="rtOrder"');
    expect(adminHtml).toContain('id="rtPackages"');
    expect(adminHtml).toContain('id="rtGuide"');
    expect(adminHtml).toContain('id="rtPolicy"');
    // #tzCardCN should not hide (UTC+8) behind single-line truncate at 360px
    expect(adminHtml).not.toMatch(/id="tzCardCN"[\s\S]{0,120}whitespace-nowrap truncate/);
  });
});
