import { describe, it, expect, vi } from 'vitest';
import worker from '../public/_worker.js';

describe('Cloudflare Pages Proxy & Fallback Routing (_worker.js)', () => {
  it('phục vụ tĩnh /admin và /admin/ trực tiếp qua env.ASSETS (để _redirects xử lý)', async () => {
    const mockAssetFetch = vi.fn().mockResolvedValue(new Response('ADMIN_HTML', { status: 200 }));
    const env = { ASSETS: { fetch: mockAssetFetch } };

    const req1 = new Request('https://trinhhg.pages.dev/admin');
    await worker.fetch(req1, env);
    expect(mockAssetFetch).toHaveBeenCalledWith(req1);

    const req2 = new Request('https://trinhhg.pages.dev/admin/');
    await worker.fetch(req2, env);
    expect(mockAssetFetch).toHaveBeenCalledWith(req2);
  });

  it('proxy ngầm các đường dẫn Link Sub (/v1 - /v6) sang Worker Backend', async () => {
    const mockGlobalFetch = vi.fn().mockResolvedValue(new Response('SUB_NODES_DATA', { status: 200 }));
    globalThis.fetch = mockGlobalFetch;

    const env = { ASSETS: { fetch: vi.fn() } };

    const paths = ['/v1/sub?token=123', '/v2/clash', '/v3/singbox', '/v4/v2ray', '/v5/wireguard', '/v6/shadowsocks'];
    for (const p of paths) {
      const req = new Request(`https://trinhhg.pages.dev${p}`);
      await worker.fetch(req, env);
    }

    expect(mockGlobalFetch).toHaveBeenCalledTimes(6);
    mockGlobalFetch.mock.calls.forEach(call => {
      const req = call[0];
      const url = new URL(req.url);
      expect(url.hostname).toBe('vpntrinhhg3worker.lucastanora.workers.dev');
    });
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it('proxy ngầm các đường dẫn /api/* và /qr/* sang Worker Backend', async () => {
    const mockGlobalFetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    globalThis.fetch = mockGlobalFetch;

    const env = { ASSETS: { fetch: vi.fn() } };

    const reqApi = new Request('https://trinhhg.pages.dev/api/public/order', { method: 'POST' });
    await worker.fetch(reqApi, env);

    const reqQr = new Request('https://trinhhg.pages.dev/qr/vietqr');
    await worker.fetch(reqQr, env);

    expect(mockGlobalFetch).toHaveBeenCalledTimes(2);
    expect(new URL(mockGlobalFetch.mock.calls[0][0].url).hostname).toBe('vpntrinhhg3worker.lucastanora.workers.dev');
    expect(new URL(mockGlobalFetch.mock.calls[1][0].url).hostname).toBe('vpntrinhhg3worker.lucastanora.workers.dev');
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it('phục vụ tĩnh các file giao diện thông thường cho env.ASSETS', async () => {
    const mockAssetFetch = vi.fn().mockResolvedValue(new Response('STATIC_FILE', { status: 200 }));
    const env = { ASSETS: { fetch: mockAssetFetch } };

    const staticPaths = ['/', '/index.html', '/admin.html', '/manifest.json', '/manifestadmin.json', '/icon-192.png', '/icon-512.png', '/assets/main.css'];
    for (const p of staticPaths) {
      const req = new Request(`https://trinhhg.pages.dev${p}`);
      await worker.fetch(req, env);
    }

    expect(mockAssetFetch).toHaveBeenCalledTimes(staticPaths.length);
  });

  it('chuyển hướng 302 từ URL rút gọn /DH... sang /portal/order/DH... và bảo toàn query string', async () => {
    const env = { ASSETS: { fetch: vi.fn() } };

    // 1. /DH... đơn giản -> chuyển sang /portal/order/DH...
    const req1 = new Request('https://trinhhg.pages.dev/DH47H06DUHTI');
    const res1 = await worker.fetch(req1, env);
    expect([301, 302, 307]).toContain(res1.status);
    expect(res1.headers.get('Location')).toBe('https://trinhhg.pages.dev/portal/order/DH47H06DUHTI');

    // 2. /DH...?test=1 -> bảo toàn query string
    const req2 = new Request('https://trinhhg.pages.dev/DH47H06DUHTI?test=1');
    const res2 = await worker.fetch(req2, env);
    expect([301, 302, 307]).toContain(res2.status);
    expect(res2.headers.get('Location')).toBe('https://trinhhg.pages.dev/portal/order/DH47H06DUHTI?test=1');

    // 3. /DH.../packages?ref=tg -> bảo toàn path con và query string
    const req3 = new Request('https://trinhhg.pages.dev/DH47H06DUHTI/packages?ref=tg');
    const res3 = await worker.fetch(req3, env);
    expect([301, 302, 307]).toContain(res3.status);
    expect(res3.headers.get('Location')).toBe('https://trinhhg.pages.dev/portal/order/DH47H06DUHTI/packages?ref=tg');
  });

  it('phục vụ các đường dẫn Portal chuẩn /portal/order/DH... qua env.ASSETS (không loop redirect)', async () => {
    const mockAssetFetch = vi.fn().mockResolvedValue(new Response('INDEX_HTML', { status: 200 }));
    const env = { ASSETS: { fetch: mockAssetFetch } };

    const portalPaths = [
      '/portal/order/DH47H06DUHTI',
      '/portal/order/DH47H06DUHTI/packages',
      '/portal/order/DH47H06DUHTI/guide',
      '/portal/order/DH47H06DUHTI/guide/windows/v2rayn'
    ];
    for (const p of portalPaths) {
      const req = new Request(`https://trinhhg.pages.dev${p}`);
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
    }

    expect(mockAssetFetch).toHaveBeenCalledTimes(portalPaths.length);
  });

  it('xử lý endpoint /api/vietqr-image: từ chối tham số không hợp lệ và fetch VietQR an toàn', async () => {
    const env = { ASSETS: { fetch: vi.fn() } };
    
    // Test từ chối khi thiếu amount hoặc memo
    const badReq = new Request('https://trinhhg.pages.dev/api/vietqr-image?amount=500');
    const resBad = await worker.fetch(badReq, env);
    expect(resBad.status).toBe(400);

    // Test gọi thành công với tham số hợp lệ
    const mockImgFetch = vi.fn().mockResolvedValue(new Response('IMAGE_BYTES', {
      status: 200,
      headers: { 'content-type': 'image/png' }
    }));
    globalThis.fetch = mockImgFetch;

    const goodReq = new Request('https://trinhhg.pages.dev/api/vietqr-image?amount=54000&addInfo=DH1234567890');
    const resGood = await worker.fetch(goodReq, env);
    expect(resGood.status).toBe(200);
    expect(resGood.headers.get('Content-Type')).toBe('image/png');
    expect(resGood.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('phục vụ ảnh QR tĩnh /assets/qr/alipay.jpg và /assets/qr/weixin.jpg với MIME ảnh và CORS hợp lệ', async () => {
    // 1. Phục vụ thành công từ env.ASSETS nếu asset tồn tại và là ảnh
    const mockAssetFetch = vi.fn().mockResolvedValue(new Response('ASSET_IMAGE_BYTES', {
      status: 200,
      headers: { 'content-type': 'image/jpeg' }
    }));
    const env = { ASSETS: { fetch: mockAssetFetch } };

    const reqAli = new Request('https://trinhhg.pages.dev/assets/qr/alipay.jpg');
    const resAli = await worker.fetch(reqAli, env);
    expect(resAli.status).toBe(200);
    expect(resAli.headers.get('Content-Type')).toBe('image/jpeg');
    expect(resAli.headers.get('Access-Control-Allow-Origin')).toBe('*');

    // 2. Fallback Pinimg an toàn khi env.ASSETS trả về HTML (SPA fallback 200 index.html)
    const mockAssetHtmlFetch = vi.fn().mockResolvedValue(new Response('<html>SPA_HTML</html>', {
      status: 200,
      headers: { 'content-type': 'text/html' }
    }));
    const envFallback = { ASSETS: { fetch: mockAssetHtmlFetch } };

    const mockFallbackFetch = vi.fn().mockResolvedValue(new Response('PINIMG_BYTES', {
      status: 200,
      headers: { 'content-type': 'image/jpeg' }
    }));
    globalThis.fetch = mockFallbackFetch;

    const reqWx = new Request('https://trinhhg.pages.dev/assets/qr/weixin.jpg');
    const resWx = await worker.fetch(reqWx, envFallback);
    expect(resWx.status).toBe(200);
    expect(resWx.headers.get('Content-Type')).toBe('image/jpeg');
    expect(resWx.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(mockFallbackFetch).toHaveBeenCalled();
  });

  it('không chuyển hướng các mã đơn không hợp lệ (ít hơn 6 ký tự hoặc ký tự lạ)', async () => {
    const mockAssetFetch = vi.fn().mockResolvedValue(new Response('NOT_FOUND_OR_STATIC', { status: 404 }));
    const env = { ASSETS: { fetch: mockAssetFetch } };

    const req = new Request('https://trinhhg.pages.dev/DH12');
    const res = await worker.fetch(req, env);
    expect(res.status).not.toBe(302);
    expect(res.status).not.toBe(307);
    expect(mockAssetFetch).toHaveBeenCalled();
  });
});
