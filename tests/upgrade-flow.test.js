import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const readSrc = rel => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

function setupDom() {
  globalThis.fetch = vi.fn(async (url) => {
    const u = String(url);
    if (u.includes('/api/public/config')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          packages: [
            { id: 't1', name: 'Gói 1 tháng', data: '100GB', vnd: 60000, cny: 15, m: 1, dev: 1, category: ['cycle', 'travel'] },
            { id: 'c1', name: 'Gói 1 tháng', data: '1000GB', vnd: 80000, cny: 20.5, m: 1, dev: 'unlimited', category: ['cycle', 'travel'] },
            { id: 'c2', name: 'Gói Cao Cấp', data: '3000GB', vnd: 160000, cny: 40, m: 1, dev: 'unlimited', category: ['cycle'] }
          ]
        })
      };
    }
    if (u.includes('/api/public/lookup')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          found: true,
          order: {
            id: 'DHUPG12345',
            email: 'upg@example.com',
            pkgId: 't1',
            pkgName: 'Gói 1 tháng',
            pkgData: '100GB',
            totalVnd: 60000,
            totalCny: 15,
            qty: 1,
            status: 'success',
            expDate: '27/12/2026',
            info3: 'https://vpntrinhhg3.pages.dev/v1/VPNTrinhHg?OwO=abc#VPNTrinhHg',
            hasInfo3: true
          }
        })
      };
    }
    return { ok: true, json: async () => ({ ok: true }) };
  });

  window.matchMedia = vi.fn().mockImplementation(q => ({
    matches: false,
    media: q,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  const html = readSrc('index.html');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  document.body.innerHTML = (bodyMatch ? bodyMatch[1] : html).replace(/<script[\s\S]*?<\/script>/gi, '');
  localStorage.clear();
  sessionStorage.clear();
}

describe('Regression: Portal Nâng gói (startUpgrade) & Gia hạn (startRenew)', () => {
  beforeEach(() => {
    setupDom();
  });

  it('startUpgrade giữ nguyên chế độ nâng gói qua router.navigate và tính đúng tiền chênh lệch khi mở checkout gói cao hơn', async () => {
    const mod = await import('../src/customer.js');
    expect(typeof mod.startUpgrade).toBe('function');
    expect(typeof mod.openPortalByOrderId).toBe('function');
    expect(typeof mod.setupAppRoutes).toBe('function');

    await mod.loadConfig();
    mod.setupAppRoutes();
    const ok = await mod.openPortalByOrderId('DHUPG12345', true);
    expect(ok).toBe(true);

    // Click NÂNG GÓI
    mod.startUpgrade();

    // Opening c1 (80,000 VND) from t1 (60,000 VND) must stay in Upgrade mode
    mod.openCheckout('c1');

    const upNote = document.getElementById('upgradePriceNote');
    const pCalc = document.getElementById('priceCalculation');
    const emailBlock = document.getElementById('emailBlock');
    expect(upNote.classList.contains('hidden')).toBe(false);
    expect(upNote.textContent).toContain('20,000VND');
    expect(pCalc.textContent).toContain('20,000VND');
    expect(emailBlock.classList.contains('hidden')).toBe(true);
  });

  it('startRenew giữ nguyên chế độ gia hạn qua router.navigate, và bấm tab Cửa hàng thường sẽ thoát chế độ nâng/gia hạn', async () => {
    const mod = await import('../src/customer.js');
    await mod.loadConfig();
    mod.setupAppRoutes();
    await mod.openPortalByOrderId('DHUPG12345', true);

    mod.startRenew();
    mod.openCheckout('t1');

    expect(document.getElementById('emailBlock').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('upgradePriceNote').classList.contains('hidden')).toBe(true);

    // Clicking normal Cửa hàng tab resets back to standard checkout
    mod.switchPortalTab('p-store');
    mod.openCheckout('c1');
    expect(document.getElementById('emailBlock').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('priceCalculation').textContent).toContain('80,000VND');
  });
});
