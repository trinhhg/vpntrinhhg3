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

  it('nhận diện route /DH... là route tĩnh để env.ASSETS xử lý cho SPA', async () => {
    const mockAssetFetch = vi.fn().mockResolvedValue(new Response('INDEX_HTML', { status: 200 }));
    const env = { ASSETS: { fetch: mockAssetFetch } };

    const portalPaths = ['/DH47H06DUHTI', '/DH47H06DUHTI/packages', '/DH47H06DUHTI/guide', '/DH47H06DUHTI/guide/windows/v2rayn'];
    for (const p of portalPaths) {
      const req = new Request(`https://trinhhg.pages.dev${p}`);
      await worker.fetch(req, env);
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

  const dlBtnCard = `<div class="flex items-center justify-start mb-3 w-full"><button type="button" onclick="downloadPaymentCard()" class="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 backdrop-blur-md border border-white/60 dark:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] shadow-sm hover:shadow-md transition active:scale-95"><i class="fas fa-arrow-down-to-line text-indigo-500"></i>${l.download_qr || 'Tải ảnh'}</button></div>`;
  const paidBtnHtml = `<div class="mt-auto pt-3 w-full"><button type="button" onclick="confirmPaid()" id="btnPaidConfirm" class="w-full bg-green-600 hover:bg-green-700 text-white font-black py-3.5 md:py-4 rounded-xl text-sm uppercase transition shadow-md flex justify-center items-center btn-heartbeat"><i class="fas fa-check-circle mr-2"></i>${l.btn_paid}</button></div>`;
  const memo = (cls, extra) => `<div class="highlight-copy py-3 px-3 rounded-xl text-center cursor-pointer mb-2" onclick="copyText('${dispId}')"><span class="block text-[11px] font-black mb-1.5 uppercase text-[#854d0e] dark:text-indigo-200">${l.copy_memo}</span><strong class="block bg-white dark:bg-black font-mono ${cls} py-2.5 rounded-xl shadow-inner border-2 border-yellow-400 dark:border-indigo-500 text-[#854d0e] dark:text-indigo-100 flex items-center justify-center gap-2">${dispId} <i class="far fa-copy opacity-50"></i></strong><p class="text-[10px] mt-1.5 italic font-bold opacity-80 ${extra} text-[#854d0e] dark:text-indigo-300">${extra?l.input_manual:l.click_copy}</p></div>`;

  if (m === 'bank') {
    const vietQrSrc = `/api/vietqr-image?amount=${currentTotalVnd}&addInfo=${encodeURIComponent(dispId)}`;
    col.innerHTML = `<div class="text-center w-full flex flex-col flex-1 justify-between h-full">
      <div id="paymentReceiptCard" class="bg-white dark:bg-[#0a0a0a] p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-white/10 text-center w-full shadow-sm mb-2">
        ${dlBtnCard}
        <div class="bg-indigo-50 dark:bg-white p-2.5 rounded-2xl inline-block mb-3 border border-transparent dark:border-indigo-500 shadow-sm dark:shadow-[0_0_15px_rgba(99,102,241,0.5)]">
          <img id="paymentQrImg" src="${vietQrSrc}" class="w-44 h-44 md:w-56 md:h-56 rounded-xl mx-auto object-contain mix-blend-multiply dark:mix-blend-normal">
        </div>
        <div class="text-left text-xs space-y-2 mb-3 w-full">
          <div class="flex justify-between bg-slate-50 dark:bg-black p-2.5 rounded-xl border border-slate-200 dark:border-white/10"><span class="text-slate-500 dark:text-slate-400">${l.bank_owner}</span><strong class="dark:text-white">TRINH THI XUAN HUONG</strong></div>
          <div class="flex justify-between bg-slate-50 dark:bg-black p-2.5 rounded-xl border border-slate-200 dark:border-white/10"><span class="text-slate-500 dark:text-slate-400">${l.bank_name}</span><strong class="dark:text-white">MB BANK</strong></div>
          <div class="flex justify-between bg-slate-50 dark:bg-black p-2.5 rounded-xl border border-slate-200 dark:border-white/10"><span class="text-slate-500 dark:text-slate-400">${l.bank_num}</span><strong class="text-indigo-600 dark:text-indigo-300 dark:drop-shadow-[0_0_8px_rgba(165,180,252,0.6)] cursor-pointer" onclick="copyText('0917678211')">0917678211 <i class="far fa-copy ml-1"></i></strong></div>
          <div class="flex justify-between bg-slate-50 dark:bg-black p-2.5 rounded-xl border border-slate-200 dark:border-white/10"><span class="text-slate-500 dark:text-slate-400">${l.copy_amount}</span><strong class="text-red-500 dark:text-red-400 font-black text-base">${fp}</strong></div>
        </div>
        ${memo('text-2xl md:text-3xl','')}
        ${decisionBadgeHtml}
      </div>
      ${paidBtnHtml}
    </div>`;
  } else {
    const ali = m === 'alipay';
    const staticQrSrc = ali ? '/assets/qr/alipay.jpg' : '/assets/qr/weixin.jpg';
    col.innerHTML = `<div class="text-center w-full flex flex-col flex-1 justify-between h-full">
      <div id="paymentReceiptCard" class="bg-white dark:bg-[#0a0a0a] p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-white/10 text-center w-full shadow-sm mb-2">
        ${dlBtnCard}
        <div class="bg-slate-50 dark:bg-white p-2.5 rounded-2xl inline-block mb-3 border border-slate-100 dark:border-transparent shadow-sm">
          <img id="paymentQrImg" src="${staticQrSrc}" class="w-48 max-w-full h-auto mx-auto rounded-lg object-contain mix-blend-multiply dark:mix-blend-normal">
        </div>
        <div class="text-left text-xs space-y-2 mb-3 w-full">
          <div class="flex justify-between bg-slate-50 dark:bg-black p-2.5 rounded-xl border border-slate-200 dark:border-white/10"><span class="text-slate-500 dark:text-slate-400">${l.bank_owner}</span><strong class="dark:text-white">TRINH THI XUAN HUONG</strong></div>
          <div class="flex justify-between bg-slate-50 dark:bg-black p-2.5 rounded-xl border border-slate-200 dark:border-white/10"><span class="text-slate-500 dark:text-slate-400">${l.copy_amount}</span><strong class="text-red-500 dark:text-red-400 font-black text-base">${fp}</strong></div>
        </div>
        ${memo('text-2xl','uppercase')}
        ${decisionBadgeHtml}
      </div>
      ${paidBtnHtml}
    </div>`;
  }
