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

      // 1. Chuyển hướng URL cũ /portal/order/DH... sang URL chuẩn mới /DH...
      const oldPortalMatch = url.pathname.match(/^\/portal\/order\/(DH[A-Za-z0-9_-]+)(\/.*)?$/i);
      if (oldPortalMatch) {
        const newPath = `/${oldPortalMatch[1]}${oldPortalMatch[2] || ""}`;
        const dest = new URL(newPath, request.url);
        dest.search = url.search;
        return Response.redirect(dest.toString(), 301);
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
            start_url: `/${cleanOid}${testQuery}`,
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

      // 2.1. Dedicated VietQR Gateway cùng Origin: Kiểm tra tham số, xử lý redirect an toàn & chống Tainted Canvas
      if (url.pathname === "/api/vietqr-image") {
        const amount = parseInt(url.searchParams.get("amount") || "0", 10);
        const addInfo = (url.searchParams.get("addInfo") || url.searchParams.get("memo") || "").trim().slice(0, 50);
        const bank = "mbbank";
        const accNum = "0917678211";
        const accName = encodeURIComponent("TRINH THI XUAN HUONG");

        if (!amount || amount < 1000 || !addInfo || !/^DH[A-Za-z0-9_-]{4,25}$/i.test(addInfo)) {
          return new Response("Invalid transaction parameters", { status: 400 });
        }

        const targetUrl = `https://img.vietqr.io/image/${bank}-${accNum}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${accName}`;

        try {
          let fetchUrl = targetUrl;
          let imgRes = await fetch(fetchUrl, {
            redirect: "manual",
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VPNTrinhHg/1.0" }
          });

          // Xử lý an toàn khi VietQR trả 301/302 Redirect: kiểm tra chặt chẽ hostname đích
          if ([301, 302, 307, 308].includes(imgRes.status)) {
            const loc = imgRes.headers.get("Location");
            if (!loc) return new Response("Redirect without Location", { status: 502 });
            const nextUrl = new URL(loc, fetchUrl);
            const allowedHosts = ["img.vietqr.io", "vietqr.io", "api.vietqr.io"];
            if (!allowedHosts.includes(nextUrl.hostname.toLowerCase())) {
              return new Response("Redirect host not allowed", { status: 403 });
            }
            fetchUrl = nextUrl.toString();
            imgRes = await fetch(fetchUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VPNTrinhHg/1.0" }
            });
          }

          if (!imgRes.ok) return new Response("Failed to fetch VietQR image", { status: 502 });

          const contentType = imgRes.headers.get("content-type") || "image/png";
          if (!contentType.startsWith("image/")) {
            return new Response("Invalid image content type", { status: 502 });
          }

          return new Response(imgRes.body, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "private, no-cache, no-store, must-revalidate",
              "Pragma": "no-cache"
            }
          });
        } catch (err) {
          return new Response("QR Gateway error: " + err.message, { status: 502 });
        }
      }

      // 2.2. QR tĩnh Alipay & Weixin (ưu tiên asset tĩnh nội bộ, fallback an toàn sang ảnh gốc)
      if (url.pathname === "/assets/qr/alipay.jpg" || url.pathname === "/assets/qr/weixin.jpg") {
        const assetRes = await env.ASSETS.fetch(request).catch(() => null);
        if (assetRes && assetRes.ok) return assetRes;

        const isAli = url.pathname.includes("alipay");
        const fallbackUrl = isAli 
          ? "https://i.pinimg.com/736x/44/57/9d/44579dfb5241614ddc897a21ce34e233.jpg"
          : "https://i.pinimg.com/736x/28/b2/95/28b29577c6229ec943e8e13afe241db3.jpg";
        
        try {
          const imgRes = await fetch(fallbackUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VPNTrinhHg/1.0" }
          });
          if (!imgRes.ok) return new Response("Failed to fetch static QR", { status: 502 });
          const contentType = imgRes.headers.get("content-type") || "image/jpeg";
          return new Response(imgRes.body, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=86400"
            }
          });
        } catch (e) {
          return new Response("Static QR fetch error", { status: 502 });
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
      // v2 — 2026-11-13 — Đồng bộ route Portal mang mã DH (/DH...) và route hướng dẫn công khai
      const isKnownRoute = url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/admin" || url.pathname === "/admin.html" || url.pathname.match(/^\/DH[A-Za-z0-9_-]+/i) || url.pathname.startsWith("/portal/") || url.pathname.startsWith("/guide") || url.pathname.startsWith("/api") || url.pathname.match(/^\/v[1-8]/) || url.pathname.startsWith("/qr") || url.pathname.startsWith("/assets/") || url.pathname.startsWith("/src/") || url.pathname === "/robots.txt" || url.pathname === "/sitemap.xml" || url.pathname === "/llms.txt" || url.pathname === "/manifest.json" || url.pathname === "/manifestadmin.json" || url.pathname === "/icon-192.png" || url.pathname === "/icon-512.png" || url.pathname.includes(".");

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
