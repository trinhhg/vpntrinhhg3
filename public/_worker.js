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
        return fetch(new Request(workerUrl.toString(), init));
      }

      // Nếu truy cập /admin -> Chuyển hướng sạch sẽ sang /admin.html
      if (url.pathname === "/admin" || url.pathname === "/admin/") {
        return Response.redirect(new URL("/admin.html", request.url).toString(), 301);
      }

      // Nếu khách truy cập bình thường -> Phục vụ file giao diện tĩnh
      return env.ASSETS.fetch(request);
    } catch (err) {
      // Fallback an toàn tuyệt đối không bao giờ để sập Worker (Error 1101)
      return env.ASSETS.fetch(request);
    }
  }
};
