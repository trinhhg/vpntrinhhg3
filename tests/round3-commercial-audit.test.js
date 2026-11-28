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

describe('Round 3 TDD — Task 1: Landing Mobile 3 Cards, Checkout Left/Right QR & Snapshot', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('Landing mobile 3 thẻ quảng cáo cuối: Mở khóa mọi nền tảng full hàng 1, Tốc độ & Không log chia 2 cột hàng 2', () => {
    const html = readSrc('index.html');
    const featWrap = html.match(/class="grid grid-cols-2 md:grid-cols-3[\s\S]*?data-i18n="feat_3"/);
    expect(featWrap).toBeTruthy();
    expect(featWrap[0]).toContain('col-span-2 md:col-span-1');
  });

  it('Checkout trái bỏ HSD dự kiến, rút gọn mô tả; Checkout phải rộng 100%, badge w-fit căn giữa trên-dưới', async () => {
    setupDomFromFile('index.html');
    const custJs = readSrc('src/customer.js');
    // Xoá HSD dự kiến khỏi #priceCalculation
    const calcMatch = custJs.match(/function calculateTotal\(\)[\s\S]*?\nfunction toggleZalo/);
    expect(calcMatch).toBeTruthy();
    expect(calcMatch[0]).not.toContain('HSD dự kiến');
    expect(calcMatch[0]).not.toContain('Est. expiry');

    // Badge phương án link w-fit mx-auto + full width w-full + snapshot mockup không lệch/cụt & hỗ trợ localhost VietQR
    const payMatch = custJs.match(/function renderPaymentBox\(\)[\s\S]*?\nasync function downloadPaymentCard/);
    expect(payMatch).toBeTruthy();
    expect(payMatch[0]).toContain('w-fit mx-auto');
    expect(payMatch[0]).not.toContain('mx-auto w-fit max-w-full');
    expect(payMatch[0]).toContain('vpntrinhhg3.pages.dev/api/vietqr-image');
    expect(payMatch[0]).toContain('crossorigin="anonymous"');
    expect(payMatch[0]).toContain('bg-indigo-50');

    const snapMatch = custJs.match(/async function preparePaymentCardSnapshot[\s\S]*?\nfunction renderPaymentBox/);
    expect(snapMatch).toBeTruthy();
    expect(snapMatch[0]).toContain('paymentMockupSnapshotHost');
    expect(snapMatch[0]).toContain('box-sizing:border-box');
    expect(snapMatch[0]).toContain('height: exactH');
    expect(snapMatch[0]).toContain('#eef2ff');
    expect(snapMatch[0]).toContain('#fef08a');
    expect(custJs).toContain('Phương án link:');
    expect(custJs).toContain('订阅方式：');
  });
});

describe('Round 3 TDD — Task 2: Worker pkg 1 cột, Cron <100GB không trùng linkIndex, Link Sub UI', () => {
  it('pkgStr ghi đủ [Tên - Giá VND / ¥CNY (GB)] (kèm [Giá cũ]) & cleanOrderForSupabase chuẩn hóa 1 cột pkg', async () => {
    const workerMod = await import('../worker.js');
    expect(typeof workerMod.pkgStr).toBe('function');
    const sNew = workerMod.pkgStr({ id: 't1', n: 'Gói 1 tháng', d: '100GB', vnd: 60000, cny: 15.5 });
    expect(sNew).toBe('Gói 1 tháng - 60,000VND / ¥15.5 (100GB)');
    const sOld = workerMod.pkgStr({ id: 'o2', n: 'Gói 1 tháng', d: '500GB', vnd: 60000, cny: 15, old: true });
    expect(sOld).toBe('[Giá cũ] Gói 1 tháng - 60,000VND / ¥15 (500GB)');

    const cleaned = workerMod.cleanOrderForSupabase({
      id: 'DHOK000100',
      pkgId: 't1',
      pkgName: 'Gói 1 tháng',
      pkgData: '100GB',
      pkg: sNew,
      totalVnd: 60000,
    });
    expect(cleaned.pkg).toBe('Gói 1 tháng - 60,000VND / ¥15.5 (100GB)');
    expect(cleaned.pkgName).toBeUndefined();
    expect(cleaned.pkgData).toBeUndefined();
  });

  it('runCron tự chuyển nguồn DJJC < 100GB sang nguồn DJJC dự phòng KHÔNG trùng linkIndex #1 đang có trên đích', async () => {
    const workerMod = await import('../worker.js');
    const workerDefault = workerMod.default;

    const djjcBad = 'https://gates.djjc.cfd/api/v1/client/subscribe?token=badtoken1111111111111111';
    const djjcGood = 'https://gates.djjc.cfd/api/v1/client/subscribe?token=goodtoken222222222222222';
    const maskExist = 'https://vpntrinhhg3.pages.dev/v2/VPNTrinhHg?token=aaaa1111aaaa1111aaaa1111aaaa1111';
    const maskMove = 'https://vpntrinhhg3.pages.dev/v2/VPNTrinhHg?token=bbbb2222bbbb2222bbbb2222bbbb2222';

    const futureExp = '30/12/2030';
    const sbDb = makeSupabaseOrdersDb([
      { id: 'DHGOOD1001', email: 'good@test.com', status: 'success', expDate: futureExp, pkgId: 't1', info3: maskExist },
      { id: 'DHMOVE1002', email: 'move@test.com', status: 'success', expDate: futureExp, pkgId: 't1', info3: maskMove },
    ]);

    const kv = makeMockKV({
      LINK_POOL: [
        { id: 'POOL-BAD', isCombo: false, url: djjcBad, provider: 'dj', protocol: 'v2', verified: true, remainGb: '50', gb: '1000', exp: futureExp, max: 30, used: 1 },
        { id: 'POOL-GOOD', isCombo: false, url: djjcGood, provider: 'dj', protocol: 'v2', verified: true, remainGb: '800', gb: '1000', exp: futureExp, max: 30, used: 1 },
      ],
      ALL_LINKS: [
        { id: 'LNK-GOOD', orderId: 'DHGOOD1001', orig: djjcGood, masked: maskExist, email: 'good@test.com', linkIndex: '1', expDate: futureExp, isLocked: false },
        { id: 'LNK-MOVE', orderId: 'DHMOVE1002', orig: djjcBad, masked: maskMove, email: 'move@test.com', linkIndex: '1', expDate: futureExp, isLocked: false },
      ],
      ALL_CMS: { settings: { autoMigrateNode: true } },
    });

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (u, opts) => {
      if (String(u).includes('supabase.test')) return sbDb.handleFetch(String(u), opts);
      return new Response('{}', { status: 200 });
    });

    const res = await workerDefault.fetch(new Request('https://worker.test/api/admin/cron', {
      method: 'POST',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: 'migrate' }),
    }), {
      VPN_KV3: kv,
      ADMIN_PASSWORD: 'pw',
      SUPABASE_URL: 'https://supabase.test',
      SUPABASE_KEY: 'sk',
      WEB_INDEX: '3',
    }, { waitUntil: () => {} });

    // Direct test via bypass auth? Let's test via /api/internal/cron with WEB_API_SECRET2
    const resInt = await workerDefault.fetch(new Request('https://worker.test/api/internal/cron', {
      method: 'POST',
      headers: { Authorization: 'Bearer sec2', 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }), {
      VPN_KV3: kv,
      WEB_API_SECRET2: 'sec2',
      SUPABASE_URL: 'https://supabase.test',
      SUPABASE_KEY: 'sk',
      WEB_INDEX: '3',
    }, { waitUntil: () => {} });

    expect(resInt.status).toBe(200);
    const out = await resInt.json();
    expect(out.details.migrated).toBe(1);

    const updatedLinks = JSON.parse(await kv.get('ALL_LINKS'));
    const moved = updatedLinks.find(l => l.id === 'LNK-MOVE');
    const kept = updatedLinks.find(l => l.id === 'LNK-GOOD');
    expect(moved.orig).toBe(djjcGood);
    expect(kept.linkIndex).toBe('1');
    expect(moved.linkIndex).toBe('2'); // Không trùng #1 trên cụm đích!
  });

  it('Link Sub UI: dùng [1]/[2] thay Nguồn 1/Nguồn 2, bỏ copy icon cạnh URL gốc, không default 30 thiết bị & chặn pollMain ghi đè stale', () => {
    const adminJs = readSrc('src/admin.js');
    const linksFn = adminJs.match(/function renderLinks\(\)[\s\S]*?\nfunction saveRootEdit|function renderLinks\(\)[\s\S]*?\n\/\/ 4\./);
    expect(linksFn).toBeTruthy();
    expect(linksFn[0]).not.toContain('Nguồn 1');
    expect(linksFn[0]).not.toContain('Nguồn 2');
    expect(linksFn[0]).not.toContain('fa-copy');
    expect(linksFn[0]).toContain('[1]');

    const rootModalFn = adminJs.match(/function openRootEditModal\([\s\S]*?\nconst saveLinks/);
    expect(rootModalFn).toBeTruthy();
    expect(rootModalFn[0]).not.toContain('p.max || 30');
    expect(rootModalFn[0]).not.toContain('p.max2 || 30');

    expect(adminJs).toContain('linksMutationSeq');
  });
});

describe('Round 3 TDD — Task 3: #t-mail Redesign (4 mẫu + Filter), #t-rev Tách 6 Gói, #t-cms Icon Màu, SortableJS & Sub-tab Phiên', () => {
  it('#t-mail xóa nút Nạp mẫu, có nút + Tạo mẫu mới, đủ 4 mẫu thương mại (gồm Mất kết nối VPN) và Bộ lọc chi tiết', () => {
    const adminHtml = readSrc('admin.html');
    const adminJs = readSrc('src/admin.js');
    expect(adminHtml).not.toContain('>Nạp mẫu<');
    expect(adminHtml).toContain('mcNewTemplate()');
    expect(adminHtml).toContain('mcScanMethodFilter');
    expect(adminHtml).toContain('mcScanExpFilter');
    expect(adminJs).toContain('troubleshoot:');
    expect(adminJs).toContain('Mất kết nối VPN');
  });

  it('#t-rev tách rõ 3 gói cũ (50k/60k/70k) vs 3 gói mới (60k/70k/80k) kèm số GB; #t-cms khôi phục màu icon mặc định; Sortable không đụng swipe', () => {
    const adminJs = readSrc('src/admin.js');
    // Revenue pkg key must differentiate old vs new & GB
    const revOverMatch = adminJs.match(/function revOver\(R, b\)[\s\S]*?gridPkgBox/);
    expect(revOverMatch).toBeTruthy();
    expect(revOverMatch[0]).not.toContain('const k = x.p ? x.p.n + "|" + x.p.vnd');

    // CMS colored icons restored (no hardcoded text-slate-500 overriding tab.col)
    const cmsTreeMatch = adminJs.match(/function renderGuideCategoriesTree\(\)[\s\S]*?cms-cat-title/);
    expect(cmsTreeMatch).toBeTruthy();
    expect(cmsTreeMatch[0]).toContain('tab.col');

    // Mobile swipe ignores all Sortable handles
    const swipeMatch = adminJs.match(/function initAdminMobileSwipe\(\)[\s\S]*?sx = t0\.clientX/);
    expect(swipeMatch).toBeTruthy();
    expect(swipeMatch[0]).toContain('.grip-pkg');
    expect(swipeMatch[0]).toContain('.grip-faq');
    expect(swipeMatch[0]).toContain('.grip-ft-col');

    // Sub-tab state resets cleanly in new session (in-memory session map, not cross-session localStorage jump)
    const subTabMatch = adminJs.match(/function getAdminSubTab\([\s\S]*?\nfunction getAdminSwipeTargetTab/);
    expect(subTabMatch).toBeTruthy();
    expect(subTabMatch[0]).not.toContain('localStorage.getItem');
  });
});

describe('Round 3 E2E Worker Integration — Combo 3 -> Auto-Fulfill -> Upgrade Keep HSD -> Idempotency -> Fail-Closed -> LoadAll Hydration', () => {
  it('Full lifecycle: /api/public/order (Combo 3 + 1-col pkg) -> /api/internal/auto_fulfill -> /api/public/upgrade (giữ nguyên expDate + nâng GB cùng token) -> idempotent repeat', async () => {
    const workerMod = await import('../worker.js');
    const workerDefault = workerMod.default;
    const sbDb = makeSupabaseOrdersDb([]);
    const lxUrl = 'https://sub.liangxin.test/api/v1/client/subscribe?token=lx1111111111111111';
    const ktUrl = 'https://sub.kitty.test/sub/kt2222222222222222';
    const kv = makeMockKV({
      LINK_POOL: [
        { id: 'POOL-LX', isCombo: false, url: lxUrl, provider: 'lx', protocol: 'v1', verified: true, remainGb: '500', gb: '1000', exp: '30/12/2030', max: 30, used: 0 },
        { id: 'POOL-KT', isCombo: false, url: ktUrl, provider: 'kt', protocol: 'v1', verified: true, remainGb: '500', gb: '1000', exp: '30/12/2030', max: 30, used: 0 },
      ],
      ALL_LINKS: [],
      ALL_CMS: {
        settings: { tz: 'VN', couponEnabled: true, fulfillMapping: { t1: lxUrl, c1: lxUrl } },
        sales: { campaign: { enabled: true, discountPercent: 20, scope: 'all', startDate: '2025-01-01', endDate: '2030-12-31' } },
        coupons: [{ code: 'VIP10', enabled: true, type: 'percent', value: 10, maxUsage: 100, usedCount: 0 }],
        giftRules: [{ enabled: true, packageIds: ['t1'], bonusDays: 5, startDate: '2025-01-01', endDate: '2030-12-31' }],
      },
    });
    const env = {
      VPN_KV3: kv,
      WEB_API_SECRET2: 'sec2',
      D1_URL: 'https://d1.test',
      D1_SECRET: 'd1sec',
      SUPABASE_URL: 'https://supabase.test',
      SUPABASE_KEY: 'sk',
      WEB_INDEX: '3',
    };

    let d1OrderStatus = 'success';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (u, opts) => {
      const urlStr = String(u);
      if (urlStr.includes('supabase.test')) return sbDb.handleFetch(urlStr, opts);
      if (urlStr.includes('d1.test/api/orders/')) {
        if (d1OrderStatus === 'HTTP_500') return new Response('err', { status: 500 });
        return new Response(JSON.stringify({ ok: true, order: { status: d1OrderStatus } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('d1.test')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
      return new Response('{}', { status: 200 });
    });

    // 1. Tạo đơn mới t1 (60k) áp combo Flash Sale (-20% = 48k) + Coupon VIP10 (-10% = 43,200 -> làm tròn 43,000đ) + Bonus +5 ngày
    const createRes = await workerDefault.fetch(new Request('https://vpntrinhhg3.pages.dev/api/public/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'DH2026R3E2E1',
        email: 'flow@test.com',
        pkgId: 't1',
        qty: 1,
        method: 'Ngân hàng VN',
        couponCode: 'VIP10',
        subLinkDecision: 'CREATE_NEW',
      }),
    }), env, { waitUntil: () => {} });
    expect(createRes.status).toBe(200);
    const created = await createRes.json();
    expect(created.ok).toBe(true);
    const oid = created.order.id;
    expect(sbDb.rows[0].pkg).toBe('Gói 1 tháng - 60,000VND / ¥15.5 (100GB)');
    expect(sbDb.rows[0].pkgName).toBeUndefined();
    expect(sbDb.rows[0].pkgData).toBeUndefined();
    expect([43000, 43200]).toContain(sbDb.rows[0].totalVnd);
    expect(sbDb.rows[0].bonusDays).toBe(5);

    // 2. Fail-closed khi D1 HTTP 500 -> không fulfill
    d1OrderStatus = 'HTTP_500';
    const failD1Res = await workerDefault.fetch(new Request('https://worker.test/api/internal/auto_fulfill', {
      method: 'POST',
      headers: { Authorization: 'Bearer sec2', 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: [oid] }),
    }), env, { waitUntil: () => {} });
    const failD1Out = await failD1Res.json();
    expect(failD1Out.results.errors).toContain(oid);
    expect(sbDb.rows[0].status).toBe('pending');

    // 3. D1 báo success -> Auto-fulfill cấp Link Sub & cộng đúng 30 + 5 = 35 ngày
    d1OrderStatus = 'success';
    const okRes = await workerDefault.fetch(new Request('https://worker.test/api/internal/auto_fulfill', {
      method: 'POST',
      headers: { Authorization: 'Bearer sec2', 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: [oid] }),
    }), env, { waitUntil: () => {} });
    const okOut = await okRes.json();
    expect(okOut.results.fulfilled).toContain(oid);
    expect(sbDb.rows[0].status).toBe('success');
    const origExpDate = sbDb.rows[0].expDate;
    const origLink = sbDb.rows[0].info3;
    expect(origLink).toMatch(/\/VPNTrinhHg\?(OwO|token)=/);
    const linksAfterFulfill = JSON.parse(await kv.get('ALL_LINKS'));
    expect(linksAfterFulfill).toHaveLength(1);

    // 4. Bắn lại auto_fulfill (Idempotency) -> không tạo thêm link, giữ nguyên expDate
    const dupRes = await workerDefault.fetch(new Request('https://worker.test/api/internal/auto_fulfill', {
      method: 'POST',
      headers: { Authorization: 'Bearer sec2', 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: [oid] }),
    }), env, { waitUntil: () => {} });
    const dupOut = await dupRes.json();
    expect(dupOut.results.already_fulfilled).toContain(oid);
    expect(JSON.parse(await kv.get('ALL_LINKS'))).toHaveLength(1);
    expect(sbDb.rows[0].expDate).toBe(origExpDate);

    // 5. Yêu cầu Nâng gói t1 -> c1 (1000GB) qua /api/public/upgrade & Auto-fulfill Upgrade
    const upgReqRes = await workerDefault.fetch(new Request('https://worker.test/api/public/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: oid, pkgId: 'c1', qty: 1, method: 'Ngân hàng VN' }),
    }), env, { waitUntil: () => {} });
    expect(upgReqRes.status).toBe(200);
    const upgFulfillRes = await workerDefault.fetch(new Request('https://worker.test/api/internal/auto_fulfill', {
      method: 'POST',
      headers: { Authorization: 'Bearer sec2', 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: [oid], upgrades: [{ orderId: oid }] }),
    }), env, { waitUntil: () => {} });
    expect(upgFulfillRes.status).toBe(200);
    expect(sbDb.rows[0].pkgId).toBe('c1');
    expect(sbDb.rows[0].pkg).toBe('Gói 1 tháng - 80,000VND / ¥20.5 (1000GB)');
    expect(sbDb.rows[0].pkgName).toBeUndefined();
    expect(sbDb.rows[0].pkgData).toBeUndefined();
    expect(sbDb.rows[0].expDate).toBe(origExpDate); // Giữ nguyên HSD gốc!
    expect(sbDb.rows[0].info3).toBe(origLink);      // Giữ nguyên Link Sub gốc!
    expect(JSON.parse(await kv.get('ALL_LINKS'))).toHaveLength(1);

    // 6. Kiểm tra hủy đơn (status=failed) bị chặn tuyệt đối khỏi auto_fulfill
    sbDb.rows.push({ id: 'DHFAIL9999', email: 'fail@test.com', status: 'failed', pkgId: 't1', totalVnd: 60000 });
    const blockedFailRes = await workerDefault.fetch(new Request('https://worker.test/api/internal/auto_fulfill', {
      method: 'POST',
      headers: { Authorization: 'Bearer sec2', 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: ['DHFAIL9999'] }),
    }), env, { waitUntil: () => {} });
    const blockedFailOut = await blockedFailRes.json();
    expect(blockedFailOut.results.errors).toContain('DHFAIL9999');
    expect(JSON.parse(await kv.get('ALL_LINKS'))).toHaveLength(1);
  });
});

describe('Single-column pkg normalization & 1-col Supabase compatibility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('cleanOrderForSupabase chuẩn hóa mọi format pkg cũ/thiếu thành chuỗi dropdown chuẩn và xóa pkgName/pkgData', async () => {
    const { cleanOrderForSupabase, detectPkg, hydrateOrderPkg } = await import('../worker.js');

    const c1 = cleanOrderForSupabase({
      id: 'DHLEGACY01',
      pkgId: 't1',
      pkg: 'Gói 1 tháng - 60,000VND',
      pkgName: 'Gói 1 tháng',
      pkgData: '100GB',
      totalVnd: 60000,
    });
    expect(c1.pkg).toBe('Gói 1 tháng - 60,000VND / ¥15.5 (100GB)');
    expect(c1.pkgName).toBeUndefined();
    expect(c1.pkgData).toBeUndefined();

    const c2 = cleanOrderForSupabase({
      id: 'DHLEGACY02',
      pkg: 'Gói 1 tháng (500GB · 70,000VND)',
      totalVnd: 210000,
    });
    expect(c2.pkg).toBe('Gói 1 tháng - 70,000VND / ¥18 (500GB)');
    expect(c2.pkgName).toBeUndefined();
    expect(c2.pkgData).toBeUndefined();

    const cOld = cleanOrderForSupabase({
      id: 'DHLEGACY03',
      pkg: 'Gói 1 tháng (100GB · 50,000VND)',
      totalVnd: 50000,
    });
    expect(cOld.pkg).toBe('[Giá cũ] Gói 1 tháng - 50,000VND / ¥12.5 (100GB)');

    expect(detectPkg({ pkg: 'Gói 1 tháng (500GB · 70,000VND)', totalVnd: 210000 }).id).toBe('t2');
    const h = hydrateOrderPkg({ id: 'DH1COL0001', pkgId: 'c1', pkg: 'Gói 1 tháng - 80,000VND / ¥20.5 (1000GB)' });
    expect(h.pkgName).toBe('Gói 1 tháng');
    expect(h.pkgData).toBe('1000GB');
  });

  it('/api/admin/poll và /api/public/lookup tự hydrate pkgName/pkgData từ bảng 1 cột pkg', async () => {
    const workerMod = await import('../worker.js');
    const workerDefault = workerMod.default;
    const sbDb = makeSupabaseOrdersDb([
      {
        id: 'DH1COLPOLL1',
        email: 'onecol@test.com',
        status: 'success',
        pkgId: 't2',
        pkg: 'Gói 1 tháng - 70,000VND / ¥18 (500GB)',
        totalVnd: 70000,
        createdTs: Date.now(),
        expDate: '30/12/2030',
        info3: 'https://vpntrinhhg3.pages.dev/v1/VPNTrinhHg?OwO=abc1234567890',
      },
    ]);
    const kv = makeMockKV({ ALL_LINKS: [], LINK_POOL: [], ALL_CMS: {} });
    const env = {
      VPN_KV3: kv,
      ADMIN_PASSWORD: 'pw',
      SUPABASE_URL: 'https://supabase.test',
      SUPABASE_KEY: 'sk',
      WEB_INDEX: '3',
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (u, opts) => {
      if (String(u).includes('supabase.test')) return sbDb.handleFetch(String(u), opts);
      return new Response('{}', { status: 200 });
    });

    const loginRes = await workerDefault.fetch(new Request('https://worker.test/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'pw' }),
    }), env, { waitUntil: () => {} });
    const { token } = await loginRes.json();

    const pollRes = await workerDefault.fetch(new Request('https://worker.test/api/admin/poll', {
      headers: { Authorization: `Bearer ${token}` },
    }), env, { waitUntil: () => {} });
    expect(pollRes.status).toBe(200);
    const pollJson = await pollRes.json();
    expect(pollJson.orders[0].pkg).toBe('Gói 1 tháng - 70,000VND / ¥18 (500GB)');
    expect(pollJson.orders[0].pkgName).toBe('Gói 1 tháng');
    expect(pollJson.orders[0].pkgData).toBe('500GB');

    const lookupRes = await workerDefault.fetch(new Request('https://vpntrinhhg3.pages.dev/api/public/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'DH1COLPOLL1' }),
    }), env, { waitUntil: () => {} });
    expect(lookupRes.status).toBe(200);
    const lookupJson = await lookupRes.json();
    expect(lookupJson.order.pkg).toBe('Gói 1 tháng - 70,000VND / ¥18 (500GB)');
    expect(lookupJson.order.pkgName).toBe('Gói 1 tháng');
    expect(lookupJson.order.pkgData).toBe('500GB');
  });

  it('src/admin.js saveOrd gửi pkgId khi pkg lưu trong DB khác nhãn dropdown dù chưa đổi selection; fake_order không hardcode thiếu', () => {
    const adminJs = readSrc('src/admin.js');
    expect(adminJs).toContain('origOrd.pkg !== selPkgLbl');
    expect(adminJs).toContain('pkgLabel(o)');
    const workerSrc = readSrc('worker.js');
    expect(workerSrc).toContain('pkg: pkgStr(PKGS.t1)');
    expect(workerSrc).not.toContain('pkg: "Gói 1 tháng - 60,000VND"');
  });
});

describe('Dynamic Package Dropdown Sync & Kho Thật JSON Import/Overwrite', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('Dropbox #mOPkg đồng bộ tên/giá/dung lượng & gói mới từ Tab Bán hàng (adminPkgsList), vẫn giữ Giá cũ o1/o2/o3', async () => {
    setupDomFromFile('admin.html');
    const mod = await import('../src/admin.js');
    // Reset to defaults then customize t2 + add custom 3-month pkg
    window.adminPkgsList = [
      ...window.getDefaultAdminPkgs().map(p => (p.id === 't2'
        ? { ...p, name: 'Gói 1 tháng Pro', vnd: 75000, cny: 19.5, data: '600GB' }
        : p)),
      { id: 'pkg_vip3m', name: 'Gói Quý 3T', time: 3, vnd: 180000, cny: 45, data: '800GB', dev: '3 Thiết bị', category: ['cycle'], features: [] },
    ];

    const entries = mod.getOrdPkgEntries();
    const t2 = entries.find(e => e[0] === 't2');
    const custom3m = entries.find(e => e[0] === 'pkg_vip3m');
    const o1 = entries.find(e => e[0] === 'o1');
    expect(t2[1]).toBe('Gói 1 tháng Pro - 75,000VND / ¥19.5 (600GB)');
    expect(custom3m[1]).toBe('Gói Quý 3T - 180,000VND / ¥45 (800GB)');
    expect(custom3m[2]).toBe(90);
    expect(o1[1]).toBe('[Giá cũ] Gói 1 tháng - 50,000VND / ¥12.5 (100GB)');
    expect(entries.some(e => e[0] === 'custom')).toBe(false);

    mod.openOrdModal();
    const sel = document.getElementById('mOPkg');
    const optTexts = [...sel.options].map(o => o.textContent);
    expect(optTexts).toContain('Gói 1 tháng Pro - 75,000VND / ¥19.5 (600GB)');
    expect(optTexts).toContain('Gói Quý 3T - 180,000VND / ¥45 (800GB)');
    expect(optTexts).toContain('[Giá cũ] Gói 1 tháng - 50,000VND / ¥12.5 (100GB)');

    sel.value = 'pkg_vip3m';
    window.onPkgChange();
    expect(document.getElementById('mODays').value).toBe('90');
    expect(document.getElementById('mOAmount').value).toBe('180000');

    document.getElementById('mOMethod').value = 'Alipay';
    window.onMethodChange();
    expect(document.getElementById('mOAmount').value).toBe('45');
  });

  it('evaluateOrdersImportJson & handleProdJsonSelect đánh giá chuẩn schema 1 cột, legacy 3 cột và file lỗi', async () => {
    setupDomFromFile('admin.html');
    const mod = await import('../src/admin.js');
    window.adminPkgsList = window.getDefaultAdminPkgs();

    const validOrder36 = {
      id: 'DH2G58BSWNML',
      email: 'hasagi868@gmail.com',
      nickname: null,
      zalo: null,
      method: 'Ngân hàng VN',
      pkgId: 't2',
      qty: 3,
      pkg: 'Gói 1 tháng - 70,000VND / ¥18 (500GB)',
      totalVnd: 210000,
      totalCny: null,
      days: 90,
      expDate: '19/01/2027',
      status: 'success',
      createdTs: 1792548480000,
      date: '21/10/2026 09:08',
      dateCreated: '21/10/2026 09:08',
      expFinal: true,
      fulfilledAt: null,
      paidAt: null,
      reason: null,
      needSupport: false,
      info1: null,
      info2: null,
      info3: 'https://vpntrinhhg3.pages.dev/v1/VPNTrinhHg?OwO=abc',
      lockInfo: '{}',
      orderType: 'new',
      sourceWeb: null,
      workerUrl: null,
      isUpgrade: false,
      upgradeStatus: null,
      upgradedAt: 0,
      pendingUpgrade: null,
      lastMailTrack: null,
      created_at: null,
      updated_at: null,
      bonusDays: 0,
    };

    const exactRep = mod.evaluateOrdersImportJson([validOrder36]);
    expect(exactRep.okToOverwrite).toBe(true);
    expect(exactRep.schemaType).toBe('exact_1col');
    expect(exactRep.matchedSchemaCols.length).toBe(36);
    expect(exactRep.legacyColsFound).toEqual([]);
    expect(exactRep.matchedPkgCount).toBe(1);

    const legacyRep = mod.evaluateOrdersImportJson([{
      ...validOrder36,
      id: 'DHLEGACY9999',
      pkgName: 'Gói 1 tháng',
      pkgData: '500GB',
    }]);
    expect(legacyRep.okToOverwrite).toBe(true);
    expect(legacyRep.schemaType).toBe('legacy_3col');
    expect(legacyRep.legacyColsFound).toEqual(['pkgName', 'pkgData']);

    const dupRep = mod.evaluateOrdersImportJson([validOrder36, { ...validOrder36 }]);
    expect(dupRep.okToOverwrite).toBe(false);
    expect(dupRep.schemaType).toBe('invalid');
    expect(dupRep.duplicateIds).toContain('DH2G58BSWNML');

    // UI upload simulation enables #btnProdOverwriteJson for valid JSON, disables for invalid
    await window.handleProdJsonSelect({
      files: [{ name: 'Backup_Orders_2026_11_28.json', async text() { return JSON.stringify([validOrder36]); } }],
    });
    expect(document.getElementById('prodJsonReport').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('prodJsonReport').textContent).toContain('Chuẩn Kho Thật 1 cột pkg');
    expect(document.getElementById('btnProdOverwriteJson').disabled).toBe(false);

    await window.handleProdJsonSelect({
      files: [{ name: 'broken.json', async text() { return JSON.stringify([{ email: 'x@y.com' }]); } }],
    });
    expect(document.getElementById('btnProdOverwriteJson').disabled).toBe(true);
    expect(document.getElementById('prodJsonReport').textContent).toContain('Không đạt chuẩn');
  });

  it('Worker POST /api/admin/prod/overwrite bảo vệ auth, backup trước, chỉ ghi đè ALL_ORDERS và giữ nguyên ALL_LINKS', async () => {
    const workerMod = await import('../worker.js');
    const workerDefault = workerMod.default;
    const prodRows = [
      { id: 'DHOLDPROD001', email: 'old@test.com', status: 'success', pkgId: 't1', pkg: 'Gói 1 tháng - 60,000VND / ¥15.5 (100GB)' },
    ];
    const testRows = [
      { id: 'DHTESTKEEP01', email: 'test@test.com', status: 'pending', pkgId: 't1', pkg: 'Gói 1 tháng - 60,000VND / ¥15.5 (100GB)' },
    ];
    const kv = makeMockKV({
      ALL_LINKS: [{ masked: 'https://vpntrinhhg3.pages.dev/v1/VPNTrinhHg?OwO=keep', orderId: 'DHKEEP' }],
      LINK_POOL: [],
      ALL_CMS: {},
    });
    const env = {
      VPN_KV3: kv,
      ADMIN_PASSWORD: 'pw',
      SUPABASE_URL: 'https://supabase.test',
      SUPABASE_KEY: 'sk',
      WEB_INDEX: '3',
    };
    const supabaseCalls = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (u, opts = {}) => {
      const urlStr = String(u);
      const m = (opts.method || 'GET').toUpperCase();
      supabaseCalls.push({ urlStr, m });
      if (urlStr.includes('/ALL_ORDERS_TEST')) {
        throw new Error('Must NOT touch ALL_ORDERS_TEST during prod overwrite');
      }
      if (urlStr.includes('/ALL_ORDERS')) {
        if (m === 'DELETE') {
          prodRows.length = 0;
          return new Response(null, { status: 204 });
        }
        if (m === 'POST') {
          const inserted = JSON.parse(opts.body || '[]');
          prodRows.push(...inserted);
          return new Response('', { status: 201 });
        }
        return new Response(JSON.stringify(prodRows), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'content-range': `0-0/${prodRows.length}` },
        });
      }
      return new Response('{}', { status: 200 });
    });

    const unauth = await workerDefault.fetch(new Request('https://worker.test/api/admin/prod/overwrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: [{ id: 'DHNEW0000001' }] }),
    }), env, { waitUntil: () => {} });
    expect(unauth.status).toBe(401);

    const loginRes = await workerDefault.fetch(new Request('https://worker.test/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'pw' }),
    }), env, { waitUntil: () => {} });
    const { token } = await loginRes.json();

    const badDup = await workerDefault.fetch(new Request('https://worker.test/api/admin/prod/overwrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orders: [{ id: 'DHNEW0000001' }, { id: 'DHNEW0000001' }] }),
    }), env, { waitUntil: () => {} });
    expect(badDup.status).toBe(400);
    expect(prodRows.length).toBe(1); // Chưa bị xóa khi payload lỗi!

    const okRes = await workerDefault.fetch(new Request('https://worker.test/api/admin/prod/overwrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        orders: [
          {
            id: 'DHNEW0000001',
            email: 'new1@test.com',
            pkgId: 't2',
            pkgName: 'Gói 1 tháng',
            pkgData: '500GB',
            pkg: 'Gói 1 tháng (500GB · 70,000VND)',
            totalVnd: 70000,
            status: 'success',
          },
          {
            id: 'DHNEW0000002',
            email: 'new2@test.com',
            pkgId: 'c2',
            pkg: 'Gói Cao Cấp - 200,000VND / ¥50 (3000GB)',
            totalVnd: 200000,
            status: 'pending',
          },
        ],
      }),
    }), env, { waitUntil: () => {} });
    expect(okRes.status).toBe(200);
    const okJson = await okRes.json();
    expect(okJson.ok).toBe(true);
    expect(okJson.count).toBe(2);
    expect(prodRows.map(r => r.id)).toEqual(['DHNEW0000001', 'DHNEW0000002']);
    expect(prodRows[0].pkg).toBe('Gói 1 tháng - 70,000VND / ¥18 (500GB)');
    expect(prodRows[0].pkgName).toBeUndefined();
    expect(prodRows[0].pkgData).toBeUndefined();
    expect(testRows.length).toBe(1);
    const savedLinks = JSON.parse(await kv.get('ALL_LINKS'));
    expect(savedLinks).toHaveLength(1);
  });
});
