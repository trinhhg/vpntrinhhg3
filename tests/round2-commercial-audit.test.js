import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const readSrc = rel => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

function setupDomFromFile(rel) {
  const html = readSrc(rel);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  document.body.innerHTML = (bodyMatch ? bodyMatch[1] : html).replace(/<script[\s\S]*?<\/script>/gi, '');
}

function makeMockKV(initial = {}) {
  const store = new Map(Object.entries(initial).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  return {
    store,
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async put(k, v) { store.set(k, String(v)); },
    async delete(k) { store.delete(k); },
    async list() { return { keys: [...store.keys()].map(name => ({ name })) }; },
  };
}

function makeSupabaseOrdersDb(initialOrders = []) {
  const rows = [...initialOrders];
  return {
    rows,
    async handleFetch(urlStr, opts = {}) {
      const m = (opts.method || 'GET').toUpperCase();
      if (m === 'GET') {
        const oidMatch = urlStr.match(/id=eq\.([^&]+)/);
        if (oidMatch) {
          const id = decodeURIComponent(oidMatch[1]);
          const found = rows.filter(r => r && String(r.id).toUpperCase() === id.toUpperCase());
          return new Response(JSON.stringify(found), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (m === 'POST') {
        const body = JSON.parse(opts.body || '[]');
        const list = Array.isArray(body) ? body : [body];
        for (const item of list) {
          const idx = rows.findIndex(r => r.id === item.id);
          if (idx >= 0) rows[idx] = { ...rows[idx], ...item };
          else rows.unshift(item);
        }
        return new Response(JSON.stringify(list), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      if (m === 'PATCH') {
        const oidMatch = urlStr.match(/id=eq\.([^&]+)/);
        const id = oidMatch ? decodeURIComponent(oidMatch[1]) : '';
        const patch = JSON.parse(opts.body || '{}');
        const idx = rows.findIndex(r => String(r.id).toUpperCase() === id.toUpperCase());
        if (idx >= 0) rows[idx] = { ...rows[idx], ...patch };
        return new Response(JSON.stringify(idx >= 0 ? [rows[idx]] : []), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('[]', { status: 200 });
    },
  };
}

describe('Round 2 TDD — Nhóm 1: Toast Top-Right & Brand Logo Logout', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('TC-03/04: #toastStackContainer ghim sát góc trên bên phải (<= 24px), không tụt xuống lưng modal dù #siteTopHeader cao 140px', async () => {
    setupDomFromFile('index.html');
    const hdr = document.getElementById('siteTopHeader');
    expect(hdr).toBeTruthy();
    hdr.getBoundingClientRect = () => ({ top: 0, left: 0, right: 360, bottom: 148, width: 360, height: 148 });

    const { showToast } = await import('../src/shared.js');
    showToast('Email không khớp!', 'error');

    const container = document.getElementById('toastStackContainer');
    expect(container).toBeTruthy();
    expect(container.className).toContain('z-[999999]');
    expect(container.className).toContain('right-3');
    // Must stay pinned at top-right corner, NOT pushed down to 156px below #siteTopHeader
    expect(container.style.top).toMatch(/12px|16px|env\(safe-area-inset-top/);
    expect(parseInt(container.style.top || '0', 10) || 12).toBeLessThanOrEqual(24);
  });

  it('TC-01/02: Bấm logo VPN Trinh Hg không gọi window.location.reload; trong Portal sẽ logout về /', async () => {
    const indexHtml = readSrc('index.html');
    expect(indexHtml).not.toContain('window.location.reload(true)');
    expect(indexHtml).toContain('handleBrandLogoClick()');

    setupDomFromFile('index.html');
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    window.scrollTo = vi.fn();

    const mod = await import('../src/customer.js');
    expect(typeof mod.EXPOSED_FNS.handleBrandLogoClick).toBe('function');

    // Simulate active portal session
    localStorage.setItem('vpn_portal_session_24h', JSON.stringify({ orderId: 'DH1234567890', savedAt: Date.now() }));
    document.documentElement.classList.add('has-user-session');
    document.getElementById('view-portal')?.classList.add('active');
    window.history.pushState({}, '', '/portal/order/DH1234567890');

    mod.EXPOSED_FNS.handleBrandLogoClick();
    expect(document.documentElement.classList.contains('has-user-session')).toBe(false);
    expect(localStorage.getItem('vpn_portal_session_24h')).toBeNull();
    expect(window.location.pathname).toBe('/');
  });
});

describe('Round 2 TDD — Nhóm 2: Combo 3 Ưu Đãi & Portal Checkout', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('TC-11/12/13: Customer Checkout hỗ trợ Flash Sale scope pkg/time, tính đúng Sale -> Coupon -> Bonus Days & hiện HSD dự kiến', async () => {
    setupDomFromFile('index.html');
    const mod = await import('../src/customer.js');
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    Element.prototype.scrollIntoView = vi.fn();

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        packages: [
          { id: 't1', name: '1 Tháng 100GB', vnd: 100000, cny: 25, time: 1, data: '100GB', dev: '3', category: ['cycle'] },
        ],
        flashSale: {
          enabled: true,
          title: 'FlashPkg',
          discountPercent: 20,
          scope: 'pkg',
          pkgIds: ['t1'],
          startDate: '2025-01-01',
          endDate: '2030-12-31',
        },
        coupons: [
          { code: 'SAVE10', type: 'percent', value: 10, minSpend: 70000, endDate: '2030-12-31', enabled: true },
        ],
        giftRules: [
          { enabled: true, packageIds: ['t1'], bonusDays: 5, sticker: 'Tặng +5 ngày', startDate: '2025-01-01', endDate: '2030-12-31' },
        ],
      }),
    });

    // Inject cfgCache via loadConfig if exposed, or verify via openCheckout + DOM
    if (typeof mod.EXPOSED_FNS.loadConfig === 'function') {
      await mod.EXPOSED_FNS.loadConfig();
    }
    const pkg1 = { id: 't1', name: '1 Tháng 100GB', vnd: 100000, cny: 25, time: 1, data: '100GB', dev: '3', category: ['cycle'] };
    const eff = mod.getEffectivePkg(pkg1);
    expect(eff.isFlashSale).toBe(true);
    expect(eff.vnd).toBe(80000);
    expect(eff.cny).toBe(20);

    mod.openCheckout('t1', [pkg1]);
    const couponInp = document.getElementById('couponInput');
    couponInp.value = 'SAVE10';
    mod.applyCouponCode();

    const calcText = document.getElementById('priceCalculation')?.textContent || '';
    expect(calcText).toContain('72,000');
    expect(calcText).toMatch(/\+\s*5\s*ngày/i);
    expect(calcText).not.toMatch(/HSD dự kiến/i);
  });

  it('TC-11/12 Worker /api/public/order: Áp Flash Sale (scope pkg) -> Coupon -> Bonus Days (x qty) & lưu metadata coupon', async () => {
    const workerMod = await import('../worker.js');
    const sbDb = makeSupabaseOrdersDb([]);
    const kv = makeMockKV({
      ALL_CMS: {
        settings: { tz: 'VN', couponEnabled: true },
        sales: {
          campaign: {
            enabled: true,
            discountPercent: 20,
            scope: 'pkg',
            pkgIds: ['t1'],
            startDate: '2025-01-01',
            endDate: '2030-12-31',
          },
        },
        coupons: [
          { code: 'VIP10K', type: 'fixed', value: 10000, minSpend: 70000, startDate: '2025-01-01', endDate: '2030-12-31', enabled: true },
        ],
        giftRules: [
          { enabled: true, packageIds: ['t1'], bonusDays: 5, startDate: '2025-01-01', endDate: '2030-12-31' },
        ],
      },
      ALL_PACKAGES: [
        { id: 't1', n: 'Gói 1 Tháng', vnd: 100000, cny: 25, m: 1, d: '100GB', category: ['cycle'] },
      ],
    });

    globalThis.fetch = vi.fn(async (input, opts) => {
      const u = typeof input === 'string' ? input : input.url;
      if (u.includes('supabase.co')) return sbDb.handleFetch(u, opts);
      return new Response('{}', { status: 200 });
    });

    const env = {
      VPN_KV: kv,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_KEY: 'test-key',
      WEB_API_SECRET2: 'sec-test',
    };
    const ctx = { waitUntil: () => {} };

    const req = new Request('https://vpntrinhhg3.pages.dev/api/public/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'DH2026COMBO1',
        email: 'combo3@example.com',
        pkgId: 't1',
        qty: 2,
        method: 'Ngân hàng VN',
        couponCode: 'VIP10K',
        subLinkDecision: 'CREATE_NEW',
      }),
    });
    const res = await workerMod.default.fetch(req, env, ctx);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    // 100,000 * 0.8 = 80,000 * 2 = 160,000 - 10,000 coupon = 150,000
    expect(data.order.totalVnd).toBe(150000);
    expect(data.order.days).toBe(70); // (30 + 5) * 2
    expect(data.order.bonusDays).toBe(10);
  });
});

describe('Round 2 TDD — Nhóm 3: Auto-Fulfill & Transaction Guard Cases', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('TC-20/23/24: auto_fulfill CHẶN đơn underpaid, đơn failed, và LỖI D1 (fail-closed); đồng thời idempotent khi gọi trùng 2 lần', async () => {
    const workerMod = await import('../worker.js');
    const pool = [
      { id: 'P1', url: 'https://sub.7777699.xyz/api/v1/owo/source_tok_12345', provider: 'lx', protocol: 'v1', verified: true, max: 30, remainGb: 500, exp: '31/12/2030' },
    ];
    const sbDb = makeSupabaseOrdersDb([
      { id: 'DHOK0001', email: 'ok@example.com', pkgId: 't1', qty: 1, pkgName: 'Gói 1 Tháng', totalVnd: 50000, status: 'pending', method: 'Ngân hàng VN', days: 30, bonusDays: 0, orderType: 'new', subLinkDecision: 'CREATE_NEW' },
      { id: 'DHUNDER1', email: 'under@example.com', pkgId: 't1', qty: 1, pkgName: 'Gói 1 Tháng', totalVnd: 50000, status: 'pending', method: 'Ngân hàng VN', days: 30, bonusDays: 0, orderType: 'new', subLinkDecision: 'CREATE_NEW' },
      { id: 'DHFAIL01', email: 'fail@example.com', pkgId: 't1', qty: 1, pkgName: 'Gói 1 Tháng', totalVnd: 50000, status: 'failed', method: 'Ngân hàng VN', days: 30, bonusDays: 0, orderType: 'new', subLinkDecision: 'CREATE_NEW' },
      { id: 'DHD1ERR1', email: 'err@example.com', pkgId: 't1', qty: 1, pkgName: 'Gói 1 Tháng', totalVnd: 50000, status: 'pending', method: 'Ngân hàng VN', days: 30, bonusDays: 0, orderType: 'new', subLinkDecision: 'CREATE_NEW' },
    ]);
    const kv = makeMockKV({ ALL_LINKS: [], LINK_POOL: pool, ALL_CMS: { settings: {} }, FULFILLMENT_CONFIG: { mapping: { t1: 'single_lx' }, failover_pref: 'lx' } });

    globalThis.fetch = vi.fn(async (input, opts) => {
      const u = typeof input === 'string' ? input : input.url;
      if (u.includes('supabase.co')) return sbDb.handleFetch(u, opts);
      if (u.includes('/api/orders/DHOK0001')) return new Response(JSON.stringify({ ok: true, order: { status: 'success' } }), { status: 200 });
      if (u.includes('/api/orders/DHUNDER1')) return new Response(JSON.stringify({ ok: true, order: { status: 'underpaid' } }), { status: 200 });
      if (u.includes('/api/orders/DHFAIL01')) return new Response(JSON.stringify({ ok: true, order: { status: 'success' } }), { status: 200 });
      if (u.includes('/api/orders/DHD1ERR1')) return new Response('D1 Down', { status: 502 });
      return new Response('{}', { status: 200 });
    });

    const env = {
      VPN_KV: kv,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_KEY: 'test-key',
      WEB_API_SECRET2: 'sec-test',
      D1_URL: 'https://d1-pay.example.workers.dev',
      D1_SECRET: 'd1-sec',
    };
    const ctx = { waitUntil: () => {} };

    const callAuto = (orderIds) => workerMod.default.fetch(new Request('https://vpntrinhhg3.pages.dev/api/internal/auto_fulfill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer sec-test' },
      body: JSON.stringify({ orderIds }),
    }), env, ctx);

    const r1 = await (await callAuto(['DHOK0001', 'DHUNDER1', 'DHFAIL01', 'DHD1ERR1'])).json();
    expect(r1.ok).toBe(true);
    expect(r1.results.fulfilled).toContain('DHOK0001');
    expect(r1.results.errors).toContain('DHUNDER1');
    expect(r1.results.errors).toContain('DHFAIL01');
    expect(r1.results.errors).toContain('DHD1ERR1');

    // Duplicate call for DHOK0001 MUST be idempotent (only 1 link created)
    const r2 = await (await callAuto(['DHOK0001'])).json();
    expect(r2.results.already_fulfilled).toContain('DHOK0001');
    expect(r2.results.fulfilled).toEqual([]);
    const linksAfter = JSON.parse(await kv.get('ALL_LINKS'));
    expect(linksAfter.length).toBe(1);
    expect(sbDb.rows.find(x => x.id === 'DHUNDER1').status).toBe('pending');
    expect(sbDb.rows.find(x => x.id === 'DHFAIL01').status).toBe('failed');
  });
});

describe('Round 2 TDD — Nhóm 4: Redesign #t-dead & #t-cms (Option A)', () => {
  beforeEach(() => {
    setupDomFromFile('admin.html');
  });

  it('TC-26/27/28/29: #t-dead bỏ hộp đen/badge màu mè, Link con gập trong <details>; #t-cms 1 thanh Lưu, ẩn input danh mục, toolbar 1 dòng mobile', async () => {
    const adminHtml = readSrc('admin.html');
    const adminJs = readSrc('src/admin.js');
    const adminCss = readSrc('src/admin.css');

    // #t-dead neutral surface checks (scoped to renderDead / renderDeadSources)
    const deadRenderMatch = adminJs.match(/function renderDead\(\)[\s\S]*?\nasync function hardDeleteSource/);
    expect(deadRenderMatch).toBeTruthy();
    expect(deadRenderMatch[0]).not.toContain('bg-slate-900 border border-slate-800');
    expect(deadRenderMatch[0]).toContain('<details');
    expect(deadRenderMatch[0]).toContain('dead-url-box');

    // #t-cms 1-Bar Focused Editor: only 1 Save button inside #cmsEditorWrap
    const cmsWrapMatch = adminHtml.match(/id="cmsEditorWrap"[\s\S]*?<\/div>\s*<\/div>\s*<!-- ===== SOẠN MAIL/);
    expect(cmsWrapMatch).toBeTruthy();
    const saveCallsInHtml = (cmsWrapMatch[0].match(/onclick="saveCms\(\)"/g) || []).length;
    expect(saveCallsInHtml).toBe(1);
    expect(adminJs).not.toContain('onclick="saveCms()"');

    // #t-cms Live TOC collapsed by default in <details>
    expect(adminHtml).toMatch(/<details[^>]*id="cmsLiveTocBox"/);

    // #t-cms single-row horizontally scrollable toolbar on mobile
    expect(adminCss).toMatch(/#t-cms\s+\.ql-toolbar\.ql-snow[\s\S]*flex-wrap:\s*nowrap/);
    expect(adminCss).toMatch(/#t-cms\s+\.ql-toolbar\.ql-snow[\s\S]*overflow-x:\s*auto/);
  });
});

describe('Round 2 TDD — Nhóm 5: Đổi Da_bi_khoa -> dabikhoa & Upstream hy2 Payload thật', () => {
  it('TC-35/36: Đồng bộ dabikhoa và tương thích ngược dữ liệu KV cũ chứa Da_bi_khoa', async () => {
    const workerMod = await import('../worker.js');
    const workerSrc = readSrc('worker.js');
    const adminSrc = readSrc('src/admin.js');
    const pySrc = readSrc('update_sub.py');

    expect(workerMod.LOCK_ORIG).toBe('dabikhoa');
    expect(typeof workerMod.isLockOrig).toBe('function');
    expect(workerMod.isLockOrig('dabikhoa')).toBe(true);
    expect(workerMod.isLockOrig('Da_bi_khoa')).toBe(true);
    expect(adminSrc).toContain('LOCK_ORIG = "dabikhoa"');
    expect(pySrc).toContain('dabikhoa');

    // Legacy KV link with orig: "Da_bi_khoa" must still route as isLocked: true
    const router = workerMod.buildGlobalRouter([
      { id: 'L_LEGACY', masked: 'https://vpntrinhhg3.pages.dev/v1?OwO=legacytok1', orig: 'Da_bi_khoa', expDate: '31/12/2030' },
      { id: 'L_NEW', masked: 'https://vpntrinhhg3.pages.dev/v1?OwO=newtok1', orig: 'dabikhoa', expDate: '31/12/2030' },
    ]);
    expect(router.legacytok1.isLocked).toBe(true);
    expect(router.legacytok1.origUrl).toBe('dabikhoa');
    expect(router.newtok1.isLocked).toBe(true);
    expect(router.newtok1.origUrl).toBe('dabikhoa');
    expect(workerSrc).not.toMatch(/const LOCK_ORIG\s*=\s*"Da_bi_khoa"/);
  });

  it('TC-37/38/39/40: Upstream fetch ưu tiên FlClash YAML + fallback v2rayN, và phân tích đủ 100% node thật từ payload anh gửi (kể cả hy2 fingerprint & mport)', async () => {
    const workerMod = await import('../worker.js');
    expect(typeof workerMod.fetchUpstreamSub).toBe('function');

    const origFile = 'C:/Users/Trinh Hg/.gemini/antigravity/brain/afba86e1-fff1-4536-8096-0b5d9a45d08b/.user_uploaded/media_1795667448963_70ce3343.txt';
    if (fs.existsSync(origFile)) {
      const txt = fs.readFileSync(origFile, 'utf8');
      const lxStart = txt.indexOf('đây là yaml của gốc liangxin:');
      const lxB64Start = txt.indexOf('đây là base64 của gốc liangxin:');
      const djStart = txt.indexOf('đây là yaml của gốc djjc:');
      const djB64Start = txt.indexOf('đây là base64 của gốc djjc:');
      const ktEnd = txt.indexOf('đây là base64 của kitty:');

      const kittyYaml = txt.slice(txt.indexOf('port: 0'), ktEnd).trim();
      const lxYaml = txt.slice(lxStart, lxB64Start).replace(/^đây là[^\n]*\n/, '').trim();
      const djYaml = txt.slice(djStart, djB64Start).replace(/^đây là[^\n]*\n/, '').trim();

      const VP = 'vless://00000000-0000-0000-0000-000000000000@127.0.0.1:1?type=tcp#';
      const info = ['⏰ HSD: 25/12/2026', '🌐 Website: vpntrinhhg.pages.dev', '📞 Zalo hỗ trợ: 0917678211'];

      const resKt = workerMod.processB64(kittyYaml, info, VP, 'kitty');
      expect(resKt.error).toBeUndefined();
      expect(resKt.yamlStr).toContain('proxies:');

      const resLx = workerMod.processB64(lxYaml, info, VP, 'liangxin');
      expect(resLx.error).toBeUndefined();
      const lxB64Dec = Buffer.from(resLx.newB64, 'base64').toString('utf8');
      expect(lxB64Dec).toContain('pinSHA256=2b6c9b75b2ef903fbe66ee91d1801941dea0ddb5429505ae3bce65e2fb17ad45');
      expect(lxB64Dec).toContain('mport=60000-65530');
      expect(resLx.yamlStr).toContain('"fingerprint":"2b6c9b75b2ef903fbe66ee91d1801941dea0ddb5429505ae3bce65e2fb17ad45"');

      const resDj = workerMod.processB64(djYaml, info, VP, 'djjc');
      expect(resDj.error).toBeUndefined();
      const djB64Dec = Buffer.from(resDj.newB64, 'base64').toString('utf8');
      expect(djB64Dec).toContain('hysteria2://');
      expect(djB64Dec).toContain('pinSHA256=');
      expect(djB64Dec).toContain('mport=50000-53000');
    }
  });
});
