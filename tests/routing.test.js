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
});
