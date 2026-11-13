const SITE_MARKDOWN = `# VPN Trinh Hg — Dịch Vụ VPN Tốc Độ Cao & Đa Nền Tảng

Website chính thức: https://vpntrinhhg3.pages.dev/
Tài liệu hướng dẫn (AI-friendly): https://vpntrinhhg3.pages.dev/llms.txt
Sitemap: https://vpntrinhhg3.pages.dev/sitemap.xml

## Giới thiệu
VPN Trinh Hg cung cấp hạ tầng VPN tối ưu hóa cho mạng di động 4G/5G và Wi-Fi tại Việt Nam, Trung Quốc và quốc tế. Tối ưu đường truyền xem TikTok, Facebook, YouTube và lướt web tốc độ cao. Hỗ trợ đa nền tảng: iOS, Android, Windows, macOS qua Shadowrocket, Clash, v2rayN.

## Gói cước mở bán
- Gói 1 tháng (100GB / 1 thiết bị): 54,000 VND
- Gói 1 tháng (500GB / 3 thiết bị): 63,000 VND
- Gói 1 tháng (1000GB / Không giới hạn thiết bị): 72,000 VND
- Gói Cao Cấp (3000GB / Không giới hạn thiết bị): 144,000 VND
- Gói 1 Năm (1000GB/tháng): 756,000 VND
- Gói Dung Lượng Vĩnh Viễn: từ 359,000 VND

## Kênh liên hệ hỗ trợ
- Zalo: 0917678211
- Telegram: @hoaian57
- Facebook: https://www.facebook.com/trinh.hg.57
`;

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      // 1. Redirect URL rút gọn /DH... sang /portal/order/DH...
      const dhMatch = url.pathname.match(/^\/(DH[A-Za-z0-9_-]+)\/?$/i);
      if (dhMatch) {
        const dest = new URL(`/portal/order/${dhMatch[1]}`, request.url);
        dest.search = url.search;
        return Response.redirect(dest.toString(), 302);
      }

      // 2. Dynamic PWA Manifest theo đúng đường dẫn đơn hàng khi cài từ Portal
      if (url.pathname === "/manifest.json") {
        const orderId = url.searchParams.get("order");
        const cleanOid = orderId ? orderId.trim().toUpperCase().replace(/[-_.\s]/g, "") : "";
        const testParam = url.searchParams.get("test");
        const testQuery = testParam === "1" ? "?test=1" : (testParam === "0" ? "?test=0" : "");
        if (cleanOid && /^DH[A-Z0-9]{6,20}$/i.test(cleanOid)) {
          const manifest = {
            name: `VPNTrinhHg - Đơn ${cleanOid}`,
            short_name: cleanOid,
            start_url: `/portal/order/${cleanOid}${testQuery}`,
            scope: "/",
            display: "standalone",
            background_color: "#ffffff",
            theme_color: "#ffffff",
            icons: [{
              src: "/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable"
            }, {
              src: "/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            }]
          };
          return new Response(JSON.stringify(manifest), {
            status: 200,
            headers: {
              "Content-Type": "application/manifest+json; charset=utf-8",
              "Cache-Control": "public, max-age=0, must-revalidate"
            }
          });
        }
      }

      // Markdown Content Negotiation cho AI Agents trên trang chủ
      if ((url.pathname === "/" || url.pathname === "/index.html") && request.headers.get("Accept")?.includes("text/markdown")) {
        return new Response(SITE_MARKDOWN, {
          status: 200,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
            "Vary": "Accept"
          }
        });
      }

      // Xử lý 404 có hỗ trợ Markdown khi truy vấn đường dẫn không tồn tại
      // v1 — 2026-11-06 20:15 (UTC+7) — Mở rộng proxy Pages cho route link ẩn /v7 và /v8
      const isKnownRoute = url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/admin" || url.pathname === "/admin.html" || url.pathname.startsWith("/portal/") || url.pathname.startsWith("/api") || url.pathname.match(/^\/v[1-8]/) || url.pathname.startsWith("/qr") || url.pathname.startsWith("/assets/") || url.pathname.startsWith("/src/") || url.pathname === "/robots.txt" || url.pathname === "/sitemap.xml" || url.pathname === "/llms.txt" || url.pathname === "/manifest.json" || url.pathname === "/manifestadmin.json" || url.pathname === "/icon-192.png" || url.pathname === "/icon-512.png" || url.pathname.includes(".");

      if (!isKnownRoute && request.headers.get("Accept")?.includes("text/markdown")) {
        const notFoundMd = `# 404 - Tài nguyên không tồn tại / Resource Not Found\n\nĐường dẫn \`${url.pathname}\` không tồn tại trên hệ thống VPNTrinhHg.\n\n- Trang chủ: https://vpntrinhhg3.pages.dev/\n- Tài liệu AI: https://vpntrinhhg3.pages.dev/llms.txt\n- Sơ đồ website: https://vpntrinhhg3.pages.dev/sitemap.xml\n`;
        return new Response(notFoundMd, {
          status: 404,
          headers: { "Content-Type": "text/markdown; charset=utf-8", "Vary": "Accept" }
        });
      }

      // Nếu là Link Sub hoặc API -> Chuyển hướng ngầm sang Worker API
      if (url.pathname.match(/^\/v[1-8]/) || url.pathname.startsWith("/api") || url.pathname.startsWith("/qr")) {
        const workerUrl = new URL(request.url);
        workerUrl.hostname = "vpntrinhhg3worker.lucastanora.workers.dev";
        const init = { method: request.method, headers: request.headers };
        if (request.method !== "GET" && request.method !== "HEAD") {
          init.body = request.body;
        }

        // Tăng cường cho /api/public/config để tự động đồng bộ Flash Sale & Coupon từ Kho Packages
        if (url.pathname === "/api/public/config" && request.method === "GET") {
          const [cfgRes, pkgRes] = await Promise.all([fetch(new Request(workerUrl.toString(), init)), fetch(new Request("https://vpntrinhhg3worker.lucastanora.workers.dev/api/packages", { headers: request.headers, cache: "no-store" })).catch(() => null)]);
          if (cfgRes && cfgRes.ok) {
            try {
              const cfgData = await cfgRes.json();
              if (pkgRes && pkgRes.ok) {
                const pkgData = await pkgRes.json();
                if (pkgData.flashSale && !cfgData.flashSale) cfgData.flashSale = pkgData.flashSale;
                if (Array.isArray(pkgData.coupons) && !cfgData.coupons) cfgData.coupons = pkgData.coupons;
                if (pkgData.couponEnabled !== undefined && cfgData.couponEnabled === undefined) cfgData.couponEnabled = pkgData.couponEnabled;
                if (Array.isArray(pkgData.giftRules) && (!cfgData.giftRules || !cfgData.giftRules.length)) cfgData.giftRules = pkgData.giftRules;
              }
              return new Response(JSON.stringify(cfgData), {
                status: 200,
                headers: {
                  "Content-Type": "application/json; charset=utf-8",
                  "Access-Control-Allow-Origin": "*",
                  "Cache-Control": "no-store, no-cache, must-revalidate"
                }
              });
            } catch (e) {
              return fetch(new Request(workerUrl.toString(), init));
            }
          }
        }

        return fetch(new Request(workerUrl.toString(), init));
      }

      // Phục vụ file giao diện tĩnh trực tiếp qua env.ASSETS (để _redirects tự xử lý)
      return env.ASSETS.fetch(request);
    } catch (err) {
      return env.ASSETS.fetch(request);
    }
  }
};
