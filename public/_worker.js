export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      // Nếu là Link Sub hoặc API -> Bẻ lái ngầm sang con Worker Test (Nơi chứa Database)
      if (url.pathname.match(/^\/v[1-6]/) || url.pathname.startsWith("/api") || url.pathname.startsWith("/qr")) {
        const workerUrl = new URL(request.url);
        workerUrl.hostname = "vpntrinhhg3worker.lucastanora.workers.dev";
        const init = {
          method: request.method,
          headers: request.headers
        };
        if (request.method !== "GET" && request.method !== "HEAD") {
          init.body = request.body;
        }

        // Tăng cường cho /api/public/config để tự động đồng bộ Flash Sale & Coupon từ Kho Packages
        if (url.pathname === "/api/public/config" && request.method === "GET") {
          const [cfgRes, pkgRes] = await Promise.all([
            fetch(new Request(workerUrl.toString(), init)),
            fetch(new Request("https://vpntrinhhg3worker.lucastanora.workers.dev/api/packages", { headers: request.headers, cache: "no-store" })).catch(() => null)
          ]);
          if (cfgRes && cfgRes.ok) {
            try {
              const cfgData = await cfgRes.json();
              if (pkgRes && pkgRes.ok) {
                const pkgData = await pkgRes.json();
                if (pkgData.flashSale && !cfgData.flashSale) cfgData.flashSale = pkgData.flashSale;
                if (Array.isArray(pkgData.coupons) && !cfgData.coupons) cfgData.coupons = pkgData.coupons;
                if (pkgData.couponEnabled !== undefined && cfgData.couponEnabled === undefined) cfgData.couponEnabled = pkgData.couponEnabled;
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
